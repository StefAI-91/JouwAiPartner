"use server";

import { revalidatePath } from "next/cache";
import { requireAdminInAction } from "@repo/auth/access";
import { getAdminClient } from "@repo/database/supabase/admin";
import { upsertProfile } from "@repo/database/mutations/team";
import { setProfileOrganization } from "@repo/database/mutations/profiles";
import { grantPortalAccess, revokePortalAccess } from "@repo/database/mutations/portal-access";
import { getProfileEmail, getProfileRole } from "@repo/database/queries/team";
import { getProfileOrganizationId } from "@repo/database/queries/profiles";
import { getProjectOrganizationId } from "@repo/database/queries/projects/lookup";
import {
  inviteProjectClientSchema,
  revokeProjectClientSchema,
  grantMemberPortalAccessSchema,
  type InviteProjectClientInput,
  type RevokeProjectClientInput,
  type GrantMemberPortalAccessInput,
} from "@repo/database/validations/portal-access";
import { notifyPortalAccessGranted } from "@repo/notifications";

/**
 * Magic link-redirect: de invite-mail landt op de devhub-callback. Die bouncet
 * users met role='client' automatisch door naar het portaal (zie
 * `apps/devhub/src/app/auth/callback/route.ts`). We hergebruiken hier dezelfde
 * whitelist-entry als de /admin/team invite-flow zodat we niet voor elke flow
 * een aparte callback-URL in Supabase hoeven te whitelisten.
 */
function invitedRedirectTo(): string {
  const base = process.env.NEXT_PUBLIC_DEVHUB_URL;
  if (!base) return "/auth/callback";
  return `${base.replace(/\/$/, "")}/auth/callback`;
}

/**
 * Invite een persoon (client of bestaand teamlid) tot een specifiek project.
 *
 * Vier paden afhankelijk van of de email al bekend is:
 * - Onbekend → invite + create profile met role='client' + grant access
 * - Bestaande client → grant access (idempotent — `grantPortalAccess` upsert)
 * - Bestaande admin → grant access (geen rol-wijziging; admins zien al alles
 *   via preview-modus, een access-rij erbij is harmless)
 * - Bestaande member → grant access (PR-024: geen rol-wijziging; member
 *   houdt zijn interne toegang en krijgt portal-toegang erbij)
 */
export async function inviteProjectClientAction(
  input: InviteProjectClientInput,
): Promise<
  { success: true; data: { profileId: string; invitedFresh: boolean } } | { error: string }
> {
  const auth = await requireAdminInAction();
  if ("error" in auth) return { error: auth.error };

  const parsed = inviteProjectClientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const admin = getAdminClient();
  const { email, projectId } = parsed.data;

  // FIX cockpit→portal-zichtbaarheid: voor klanten moet `profiles.organization_id`
  // gelijk zijn aan de project-org, anders blokkeert RLS op `client_questions`
  // de SELECT (zie `20260430110000_client_questions.sql` PR-SEC-030). Zonder
  // deze sync zien klanten niets — admins wel, omdat die door
  // `NOT is_client(auth.uid())` heen lopen.
  const projectOrgId = await getProjectOrganizationId(projectId, admin);
  if (!projectOrgId) return { error: "Project niet gevonden" };

  // Bestaat de email al?
  let existingUserId: string | null = null;
  try {
    const { data: list } = await admin.auth.admin.listUsers();
    existingUserId = list?.users?.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
  } catch {
    // ignore — door naar invite-pad
  }

  if (existingUserId) {
    // Rol-lookup is nu alleen nog informatief — bij member/admin laten we de
    // rol staan en grant idempotent access. Dat houdt de cockpit/devhub
    // toegang van members intact (PR-024).
    const role = await getProfileRole(existingUserId, admin);

    // Klanten zijn single-tenant: mismatching org tussen huidige profile en
    // het project blokkeert toch zichtbaarheid via RLS. Liever expliciet
    // erroren dan stil grant'en + onzichtbare berichten als gevolg.
    if (role === "client") {
      const orgSync = await syncClientProfileOrganization(existingUserId, projectOrgId, admin);
      if ("error" in orgSync) return { error: orgSync.error };
    }

    const grantResult = await grantPortalAccess(existingUserId, projectId, admin);
    if ("error" in grantResult) return { error: grantResult.error };

    // Supabase Auth stuurt geen invite-mail voor bestaande users — daarom
    // sturen we hier zelf een "je hebt nu toegang"-mail via Resend, anders
    // krijgt de ontvanger nul signaal dat ze het project kunnen openen.
    await notifyPortalAccessGranted({ to: email, projectId }, admin);

    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: { profileId: existingUserId, invitedFresh: false } };
  }

  // Nieuwe gebruiker → invite + profile + grant
  const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: invitedRedirectTo(),
  });
  if (inviteErr || !inviteData?.user?.id) {
    return { error: `Invite mislukt: ${inviteErr?.message ?? "onbekende fout"}` };
  }
  const userId = inviteData.user.id;

  // handle_new_user-trigger maakt mogelijk al een placeholder met
  // role='member' — wij overschrijven naar 'client'.
  const profileResult = await upsertProfile({ id: userId, email, role: "client" }, admin);
  if ("error" in profileResult) {
    return { error: `Profile upsert mislukt: ${profileResult.error}` };
  }

  // Eerst org koppelen, dan pas grant: als de org-update faalt willen we
  // geen "wel access, geen zichtbaarheid"-tussenstand achterlaten.
  const orgSync = await syncClientProfileOrganization(userId, projectOrgId, admin);
  if ("error" in orgSync) return { error: orgSync.error };

  const grantResult = await grantPortalAccess(userId, projectId, admin);
  if ("error" in grantResult) return { error: grantResult.error };

  revalidatePath(`/projects/${projectId}`);
  return { success: true, data: { profileId: userId, invitedFresh: true } };
}

/**
 * Zet `profiles.organization_id` voor een klant gelijk aan de project-org.
 *
 * - NULL → set naar projectOrg
 * - gelijk → no-op
 * - mismatch → error (klant is single-tenant; cross-org-uitnodigingen vragen
 *   om expliciete migratie van klant-data, geen stille overwrite)
 *
 * Niet bedoeld voor members/admins — die lopen niet langs de RLS-org-check.
 */
async function syncClientProfileOrganization(
  profileId: string,
  projectOrgId: string,
  admin: ReturnType<typeof getAdminClient>,
): Promise<{ success: true } | { error: string }> {
  const currentOrg = await getProfileOrganizationId(profileId, admin);
  if (currentOrg === projectOrgId) return { success: true };
  if (currentOrg !== null) {
    return {
      error:
        "Deze klant is gekoppeld aan een andere organisatie. Migreer eerst de klant-organisatie of gebruik een ander account.",
    };
  }
  return setProfileOrganization(profileId, projectOrgId, admin);
}

/**
 * PR-024: geef een bestaand teamlid portal-toegang tot een project zonder
 * een invite-mail te sturen of de rol te wijzigen. Member behoudt
 * cockpit/devhub toegang en kan voortaan vanuit de portal-tab meekijken
 * met de klant in dezelfde view-context.
 *
 * Verwacht een bestaande `profile_id` (member of admin). Idempotent op
 * DB-niveau via `grantPortalAccess`.
 */
export async function grantMemberPortalAccessAction(
  input: GrantMemberPortalAccessInput,
): Promise<{ success: true; data: { profileId: string } } | { error: string }> {
  const auth = await requireAdminInAction();
  if ("error" in auth) return { error: auth.error };

  const parsed = grantMemberPortalAccessSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const admin = getAdminClient();
  const { profileId, projectId } = parsed.data;

  const role = await getProfileRole(profileId, admin);
  if (role === null) return { error: "Onbekend profiel" };
  if (role === "client") {
    return { error: "Dit is een klant — gebruik de invite-flow met email." };
  }

  const grantResult = await grantPortalAccess(profileId, projectId, admin);
  if ("error" in grantResult) return { error: grantResult.error };

  // Member krijgt portal-toegang erbij — stuur een "je hebt nu toegang"-mail
  // zodat hij/zij weet dat het project nu zichtbaar is in het portaal. Voor
  // admins skippen we: die zien al alles via preview-modus en hoeven geen
  // self-notify.
  if (role === "member") {
    const email = await getProfileEmail(profileId, admin);
    if (email) {
      await notifyPortalAccessGranted({ to: email, projectId }, admin);
    }
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true, data: { profileId } };
}

/**
 * Trek de portaal-toegang van één persoon (klant of teamlid) tot één project
 * in. Profile blijft staan (attributie); andere projecten waar de persoon
 * toegang toe heeft worden niet geraakt. Niet idempotent in de zin dat tweede
 * call een geen-op is, maar `revokePortalAccess` is wel idempotent op DB-niveau.
 */
export async function revokeProjectClientAction(
  input: RevokeProjectClientInput,
): Promise<{ success: true } | { error: string }> {
  const auth = await requireAdminInAction();
  if ("error" in auth) return { error: auth.error };

  const parsed = revokeProjectClientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const admin = getAdminClient();
  const { profileId, projectId } = parsed.data;

  const result = await revokePortalAccess(profileId, projectId, admin);
  if ("error" in result) return { error: result.error };

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdminInAction } from "@repo/auth/access";
import { getAdminClient } from "@repo/database/supabase/admin";
import { upsertProfile } from "@repo/database/mutations/team";
import { grantPortalAccess, revokePortalAccess } from "@repo/database/mutations/portal-access";
import { getProfileRole } from "@repo/database/queries/team";
import {
  inviteProjectClientSchema,
  revokeProjectClientSchema,
  type InviteProjectClientInput,
  type RevokeProjectClientInput,
} from "@repo/database/validations/portal-access";

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
 * Invite een klant tot een specifiek project.
 *
 * Vier paden afhankelijk van of de email al bekend is:
 * - Onbekend → invite + create profile met role='client' + grant access
 * - Bestaande client → grant access (idempotent — `grantPortalAccess` upsert)
 * - Bestaande admin → grant access (geen rol-wijziging; admins zien al alles
 *   via preview-modus, een access-rij erbij is harmless)
 * - Bestaande member → error: "is een teamlid". Member→client migratie is
 *   bewust geen automatisch pad — moet via /admin/team gebeuren zodat de
 *   admin expliciet kiest dat de gebruiker geen interne toegang meer heeft.
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

  // Bestaat de email al?
  let existingUserId: string | null = null;
  try {
    const { data: list } = await admin.auth.admin.listUsers();
    existingUserId = list?.users?.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
  } catch {
    // ignore — door naar invite-pad
  }

  if (existingUserId) {
    const role = await getProfileRole(existingUserId, admin);
    if (role === "member") {
      return {
        error:
          "Deze gebruiker is een teamlid. Wijzig zijn rol via Team-beheer voordat je portaal-toegang verleent.",
      };
    }
    // admin of client → grant idempotent
    const grantResult = await grantPortalAccess(existingUserId, projectId, admin);
    if ("error" in grantResult) return { error: grantResult.error };

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

  const grantResult = await grantPortalAccess(userId, projectId, admin);
  if ("error" in grantResult) return { error: grantResult.error };

  revalidatePath(`/projects/${projectId}`);
  return { success: true, data: { profileId: userId, invitedFresh: true } };
}

/**
 * Trek de portaal-toegang van één client tot één project in. Profile blijft
 * staan (attributie); andere projecten waar de client toegang toe heeft
 * worden niet geraakt. Niet idempotent in de zin dat tweede call een geen-op
 * is, maar `revokePortalAccess` is wel idempotent op DB-niveau.
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

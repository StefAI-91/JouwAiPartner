"use server";

import { revalidatePath } from "next/cache";
import { requireAdminInAction } from "@repo/auth/access";
import { getAdminClient } from "@repo/database/supabase/admin";
import { countAdmins, getUserWithAccess } from "@repo/database/queries/team";
import {
  inviteUserSchema,
  updateUserAccessSchema,
  deactivateUserSchema,
  type InviteUserInput,
  type UpdateUserAccessInput,
  type DeactivateUserInput,
} from "@repo/database/validations/team";

type ActionResult<T = undefined> = T extends undefined
  ? { success: true } | { error: string }
  : { success: true; data: T } | { error: string };

function invitedRedirectTo(): string {
  // Magic link in the invite mail lands on DevHub callback by default — the
  // callback then routes admins back to cockpit. This keeps one whitelist entry.
  const base = process.env.NEXT_PUBLIC_DEVHUB_URL;
  if (!base) return "/auth/callback";
  return `${base.replace(/\/$/, "")}/auth/callback`;
}

/**
 * FUNC-170 / FUNC-171 / SEC-185: Invite a user via Supabase Admin API.
 *
 * Flow (aanbevolen pad uit sprint):
 *   1. `admin.auth.admin.inviteUserByEmail` → krijgt de echte `auth.users.id`.
 *   2. Upsert `profiles` row met de juiste role (`handle_new_user` trigger
 *      doet ON CONFLICT DO NOTHING dus geen dubbele insert).
 *   3. Voor members: insert `devhub_project_access` rows.
 *
 * Idempotent: bestaande email → Supabase retourneert hetzelfde user-id, we
 * updaten rol + access. Geen nieuwe mail tenzij `resendInvite: true`.
 */
export async function inviteUserAction(
  input: InviteUserInput,
): Promise<{ success: true; data: { userId: string; invitedFresh: boolean } } | { error: string }> {
  const auth = await requireAdminInAction();
  if ("error" in auth) return { error: auth.error };

  const parsed = inviteUserSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const admin = getAdminClient();
  const { email, role, projectIds, resendInvite } = parsed.data;

  // EDGE-180: check of user al bestaat. Supabase heeft geen directe "find by
  // email" — we gebruiken listUsers met email filter (beschikbaar sinds
  // supabase-js v2). Dit is best-effort; bij error vallen we terug op invite.
  let existingUserId: string | null = null;
  try {
    const { data: list } = await admin.auth.admin.listUsers();
    existingUserId = list?.users?.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
  } catch {
    // ignore; doorgaan met invite
  }

  let userId: string;
  let invitedFresh = false;

  if (existingUserId && !resendInvite) {
    userId = existingUserId;
  } else {
    // EDGE-181: Supabase mail-fail → mutaties hieronder gebeuren dan niet.
    // Wanneer inviteUserByEmail faalt retourneren we error zodat admin kan
    // retry'en zonder handmatige cleanup.
    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: invitedRedirectTo(),
    });
    if (inviteErr || !inviteData?.user?.id) {
      return { error: `Invite mislukt: ${inviteErr?.message ?? "onbekende fout"}` };
    }
    userId = inviteData.user.id;
    invitedFresh = !existingUserId;
  }

  // Upsert profile met de gewenste role. handle_new_user-trigger heeft mogelijk
  // al een placeholder-row gemaakt met role='member' — wij overschrijven.
  const { error: profileErr } = await admin
    .from("profiles")
    .upsert({ id: userId, email, role }, { onConflict: "id" });
  if (profileErr) return { error: `Profile upsert mislukt: ${profileErr.message}` };

  // Sync project-access (members only; admins impliciet alles — RULE-161).
  if (role === "member") {
    // Vervang bestaande access rows door de nieuwe set (atomair-ish: delete+insert).
    const { error: delErr } = await admin
      .from("devhub_project_access")
      .delete()
      .eq("profile_id", userId);
    if (delErr) return { error: `Access reset mislukt: ${delErr.message}` };

    if (projectIds.length > 0) {
      const rows = projectIds.map((pid) => ({ profile_id: userId, project_id: pid }));
      const { error: insErr } = await admin.from("devhub_project_access").insert(rows);
      if (insErr) return { error: `Access insert mislukt: ${insErr.message}` };
    }
  } else {
    // Role switched to admin → strip stale access rows (niet langer nodig).
    await admin.from("devhub_project_access").delete().eq("profile_id", userId);
  }

  revalidatePath("/admin/team");
  return { success: true, data: { userId, invitedFresh } };
}

/**
 * FUNC-174 / SEC-186: Update role en/of project-access van een bestaande user.
 * Weigert de laatste admin te demoot (defense-in-depth — DB-trigger vangt ook).
 */
export async function updateUserAccessAction(input: UpdateUserAccessInput): Promise<ActionResult> {
  const auth = await requireAdminInAction();
  if ("error" in auth) return { error: auth.error };

  const parsed = updateUserAccessSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const admin = getAdminClient();
  const { userId, role, projectIds } = parsed.data;

  // Laatste-admin guardrail.
  if (role === "member") {
    const current = await getUserWithAccess(userId, admin);
    if (current?.role === "admin") {
      const admins = await countAdmins(admin);
      if (admins <= 1) {
        return { error: "Kan laatste admin niet demoot — er moet minstens één admin blijven." };
      }
    }
  }

  if (role !== undefined) {
    const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
    if (error) return { error: `Rol-update mislukt: ${error.message}` };
  }

  if (projectIds !== undefined) {
    // Bepaal de effectieve rol na de eventuele role-update hierboven.
    const effectiveRole =
      role ??
      (await admin.from("profiles").select("role").eq("id", userId).maybeSingle()).data?.role;

    if (effectiveRole === "admin") {
      // Admins: geen access-rows nodig.
      await admin.from("devhub_project_access").delete().eq("profile_id", userId);
    } else {
      await admin.from("devhub_project_access").delete().eq("profile_id", userId);
      if (projectIds.length > 0) {
        const rows = projectIds.map((pid) => ({ profile_id: userId, project_id: pid }));
        const { error } = await admin.from("devhub_project_access").insert(rows);
        if (error) return { error: `Access insert mislukt: ${error.message}` };
      }
    }
  }

  revalidatePath("/admin/team");
  return { success: true };
}

/**
 * FUNC-173 / SEC-186: Deactivate een user. Bant de auth.user (100 jaar) en
 * verwijdert alle project-access. Profile blijft voor attributie van historische
 * comments/activity.
 */
export async function deactivateUserAction(input: DeactivateUserInput): Promise<ActionResult> {
  const auth = await requireAdminInAction();
  if ("error" in auth) return { error: auth.error };

  const parsed = deactivateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const admin = getAdminClient();
  const { userId } = parsed.data;

  // Guardrail: laatste admin niet deactiveren.
  const current = await getUserWithAccess(userId, admin);
  if (!current) return { error: "User niet gevonden" };
  if (current.role === "admin") {
    const admins = await countAdmins(admin);
    if (admins <= 1) {
      return { error: "Kan laatste admin niet deactiveren — er moet minstens één admin blijven." };
    }
  }

  // Supabase Admin API: ban_duration in de vorm "<N>h" of "none" om te un-bannen.
  const { error: banErr } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "876000h", // ~100 jaar
  });
  if (banErr) return { error: `Ban mislukt: ${banErr.message}` };

  const { error: accessErr } = await admin
    .from("devhub_project_access")
    .delete()
    .eq("profile_id", userId);
  if (accessErr) return { error: `Access cleanup mislukt: ${accessErr.message}` };

  revalidatePath("/admin/team");
  return { success: true };
}

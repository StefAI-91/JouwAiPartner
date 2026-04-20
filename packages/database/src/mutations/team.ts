import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export type ProfileRole = "admin" | "member" | "client";

export interface UpsertProfileInput {
  id: string;
  email: string;
  role: ProfileRole;
}

export interface ProjectAccessRow {
  profile_id: string;
  project_id: string;
}

/**
 * Upsert a profile row with the desired role. Used by `inviteUserAction` to
 * overwrite the placeholder row that the `handle_new_user` trigger may have
 * created with role='member'.
 *
 * @param client Supabase client to use. Defaults to the admin (service-role)
 * client when omitted — see `packages/database/README.md` for the client-scope
 * policy.
 */
export async function upsertProfile(
  input: UpsertProfileInput,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db
    .from("profiles")
    .upsert({ id: input.id, email: input.email, role: input.role }, { onConflict: "id" });
  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Update the role of an existing profile. Returns `{ error }` on DB failure.
 * Caller is responsible for any last-admin guardrails — `countAdmins` +
 * `getUserWithAccess` are the recommended helpers for that check.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function updateProfileRole(
  userId: string,
  role: ProfileRole,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Remove all `devhub_project_access` rows for a user. Used both to fully revoke
 * access (deactivation, role → admin) and as the "delete-then-insert" first
 * half of an access-set replace.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function clearProjectAccess(
  userId: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db.from("devhub_project_access").delete().eq("profile_id", userId);
  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Insert a batch of project-access rows. Caller is expected to have called
 * `clearProjectAccess` first when replacing the access-set.
 *
 * Returns `{ success: true }` when `rows` is empty (no-op) — this keeps the
 * delete-then-insert pattern clean at the call site.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function insertProjectAccess(
  rows: ProjectAccessRow[],
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  if (rows.length === 0) return { success: true };
  const db = client ?? getAdminClient();
  const { error } = await db.from("devhub_project_access").insert(rows);
  if (error) return { error: error.message };
  return { success: true };
}

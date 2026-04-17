import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export interface GrantPortalAccessResult {
  id: string;
  profile_id: string;
  project_id: string;
  created_at: string;
}

/**
 * Grant a client user access to a portal project. Idempotent: on conflict with
 * the (profile_id, project_id) UNIQUE, returns the existing row instead of
 * erroring.
 *
 * Admin-only — caller must enforce access (e.g. via `requireAdminInAction`)
 * before invoking. RLS on `portal_project_access` already restricts writes to
 * admins, but the server-side check gives us a cleaner error surface.
 */
export async function grantPortalAccess(
  profileId: string,
  projectId: string,
  client?: SupabaseClient,
): Promise<{ success: true; data: GrantPortalAccessResult } | { error: string }> {
  if (!profileId) return { error: "Missing profile id" };
  if (!projectId) return { error: "Missing project id" };

  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("portal_project_access")
    .upsert(
      { profile_id: profileId, project_id: projectId },
      { onConflict: "profile_id,project_id", ignoreDuplicates: false },
    )
    .select("id, profile_id, project_id, created_at")
    .single();

  if (error || !data) {
    console.error("[grantPortalAccess] Error:", error?.message);
    return { error: error?.message ?? "Kon portal-toegang niet toevoegen" };
  }

  return { success: true, data: data as GrantPortalAccessResult };
}

/**
 * Revoke a client user's access to a portal project. Idempotent: no error if
 * the row does not exist.
 *
 * Admin-only — see note on `grantPortalAccess`.
 */
export async function revokePortalAccess(
  profileId: string,
  projectId: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  if (!profileId) return { error: "Missing profile id" };
  if (!projectId) return { error: "Missing project id" };

  const db = client ?? getAdminClient();

  const { error } = await db
    .from("portal_project_access")
    .delete()
    .eq("profile_id", profileId)
    .eq("project_id", projectId);

  if (error) {
    console.error("[revokePortalAccess] Error:", error.message);
    return { error: error.message };
  }

  return { success: true };
}

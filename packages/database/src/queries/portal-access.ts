import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export interface PortalProject {
  id: string;
  name: string;
  project_key: string | null;
  organization_id: string | null;
  status: string | null;
}

/**
 * List all projects a portal (client) user has access to via
 * `portal_project_access`. Returns an empty array if the user has no rows.
 *
 * Caller should already have established that the user is a client — this
 * function does not check role, it just joins on the access table.
 */
export async function listPortalProjects(
  profileId: string,
  client?: SupabaseClient,
): Promise<PortalProject[]> {
  if (!profileId) return [];

  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("portal_project_access")
    .select("projects(id, name, project_key, organization_id, status)")
    .eq("profile_id", profileId);

  if (error) {
    console.error("[listPortalProjects] Error:", error.message);
    return [];
  }

  const rows = (data ?? []) as Array<{ projects: PortalProject | null }>;
  return rows
    .map((row) => row.projects)
    .filter((p): p is PortalProject => p !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Boolean check whether a client user has portal access to a specific project.
 *
 * Uses the `portal_project_access` table directly — no admin bypass, since
 * this is intended to be called after we know the user is a client. Admin
 * checks should use `isAdmin()` from `@repo/auth/access`.
 */
export async function hasPortalProjectAccess(
  profileId: string,
  projectId: string,
  client?: SupabaseClient,
): Promise<boolean> {
  if (!profileId || !projectId) return false;

  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("portal_project_access")
    .select("id")
    .eq("profile_id", profileId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    console.error("[hasPortalProjectAccess] Error:", error.message);
    return false;
  }

  return data !== null;
}

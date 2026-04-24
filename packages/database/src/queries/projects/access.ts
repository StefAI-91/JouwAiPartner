import type { SupabaseClient } from "@supabase/supabase-js";
import { listAccessibleProjectIds } from "@repo/auth/access";
import { getAdminClient } from "../../supabase/admin";

export interface AccessibleProject {
  id: string;
  name: string;
  project_key: string | null;
}

/**
 * List projects accessible to the given user.
 *
 * - Admins receive all projects (see `listAccessibleProjectIds` in @repo/auth/access).
 * - Members receive only the projects linked via `devhub_project_access`.
 * - No bootstrap-fallback: a member without access rows receives an empty list.
 */
export async function listAccessibleProjects(
  userId: string,
  client?: SupabaseClient,
): Promise<AccessibleProject[]> {
  const db = client ?? getAdminClient();

  const projectIds = await listAccessibleProjectIds(userId, db);
  if (projectIds.length === 0) return [];

  const { data, error } = await db
    .from("projects")
    .select("id, name, project_key")
    .in("id", projectIds)
    .order("name");

  if (error) {
    console.error("[listAccessibleProjects] Error fetching projects:", error.message);
    return [];
  }
  return (data ?? []) as AccessibleProject[];
}

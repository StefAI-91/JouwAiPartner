import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export interface AccessibleProject {
  id: string;
  name: string;
  project_key: string | null;
}

/**
 * List projects accessible to the current user via devhub_project_access.
 * Falls back to all projects if no access rows exist (bootstrap scenario).
 */
export async function listAccessibleProjects(
  userId: string,
  client?: SupabaseClient,
): Promise<AccessibleProject[]> {
  const db = client ?? getAdminClient();

  // Check if user has explicit access rows
  const { data: accessRows, error: accessError } = await db
    .from("devhub_project_access")
    .select("project_id")
    .eq("profile_id", userId);

  if (accessError) {
    console.error("[listAccessibleProjects] Error fetching access:", accessError.message);
    return [];
  }

  // If no access rows, return all projects (bootstrap / admin fallback)
  if (!accessRows || accessRows.length === 0) {
    const { data, error } = await db.from("projects").select("id, name, project_key").order("name");

    if (error) {
      console.error("[listAccessibleProjects] Error fetching projects:", error.message);
      return [];
    }
    return (data ?? []) as AccessibleProject[];
  }

  const projectIds = accessRows.map((r) => r.project_id);
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

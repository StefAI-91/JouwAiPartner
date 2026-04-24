import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdmin } from "@repo/auth/access";
import { getAdminClient } from "../../supabase/admin";

export interface PortalProject {
  id: string;
  name: string;
  project_key: string | null;
  organization_id: string | null;
  status: string | null;
}

const PORTAL_PROJECT_COLS = "id, name, project_key, organization_id, status";

/**
 * List all projects visible in the portal for the given user.
 *
 * - Admin → alle projecten (preview-modus zodat admins het portaal kunnen
 *   bekijken vanuit intern perspectief, analoog aan `listAccessibleProjectIds`).
 * - Client → alleen de projecten met een rij in `portal_project_access`.
 * - Anders (member/onbekend) → lege lijst.
 */
export async function listPortalProjects(
  profileId: string,
  client?: SupabaseClient,
): Promise<PortalProject[]> {
  if (!profileId) return [];

  const db = client ?? getAdminClient();

  if (await isAdmin(profileId, db)) {
    const { data, error } = await db.from("projects").select(PORTAL_PROJECT_COLS).order("name");
    if (error) {
      console.error("[listPortalProjects] Admin fetch error:", error.message);
      return [];
    }
    return (data ?? []) as PortalProject[];
  }

  const { data, error } = await db
    .from("portal_project_access")
    .select(`projects(${PORTAL_PROJECT_COLS})`)
    .eq("profile_id", profileId);

  if (error) {
    console.error("[listPortalProjects] Error:", error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as Array<{ projects: PortalProject | null }>;
  return rows
    .map((row) => row.projects)
    .filter((p): p is PortalProject => p !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Boolean check whether a user has portal access to a specific project.
 *
 * Admins krijgen altijd `true` (preview-modus). Clients via
 * `portal_project_access`. Overige rollen → `false`.
 */
export async function hasPortalProjectAccess(
  profileId: string,
  projectId: string,
  client?: SupabaseClient,
): Promise<boolean> {
  if (!profileId || !projectId) return false;

  const db = client ?? getAdminClient();

  if (await isAdmin(profileId, db)) return true;

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

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
 * - Client of member → alleen de projecten met een rij in `portal_project_access`.
 *   Members zonder rijen krijgen een lege lijst (geen redirect — ze blijven
 *   op de portal-empty-state). Zie PR-024 (SEC-221).
 * - Anonieme/onbekende user → lege lijst.
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

export type PortalAssigneeRole = "client" | "member" | "admin";

export interface ProjectAssignee {
  profile_id: string;
  email: string;
  full_name: string | null;
  role: PortalAssigneeRole;
  granted_at: string;
  last_sign_in_at: string | null;
}

/**
 * List alle profielen met portal-access voor één project — clients én members.
 * Gebruikt vanuit cockpit project-detail om de "Portaltoegang" sectie te
 * vullen. Admin-only — caller moet access enforcen vóór invocatie.
 *
 * `last_sign_in_at` komt uit `auth.users` en vereist daarom de service-role
 * client; default-fallback naar admin-client wordt expliciet gedaan.
 */
export async function listPortalProjectAssignees(
  projectId: string,
  client?: SupabaseClient,
): Promise<ProjectAssignee[]> {
  if (!projectId) return [];

  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("portal_project_access")
    .select(`profile_id, created_at, profiles(email, full_name, role)`)
    .eq("project_id", projectId);

  if (error) {
    console.error("[listPortalProjectAssignees] Error:", error.message);
    return [];
  }

  type Row = {
    profile_id: string;
    created_at: string;
    profiles: { email: string; full_name: string | null; role: PortalAssigneeRole } | null;
  };

  const rows = (data ?? []) as unknown as Row[];

  const assignees = rows.filter(
    (row): row is Row & { profiles: NonNullable<Row["profiles"]> } => row.profiles !== null,
  );

  if (assignees.length === 0) return [];

  // Verrijk met last_sign_in_at uit auth.users — alleen via service role
  // beschikbaar. Caller is verantwoordelijk voor admin-context (zie comment).
  const adminClient = getAdminClient();
  const { data: authList } = await adminClient.auth.admin.listUsers();
  const lastSignInById = new Map(
    (authList?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null] as const),
  );

  return assignees
    .map((row) => ({
      profile_id: row.profile_id,
      email: row.profiles.email,
      full_name: row.profiles.full_name,
      role: row.profiles.role,
      granted_at: row.created_at,
      last_sign_in_at: lastSignInById.get(row.profile_id) ?? null,
    }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

/**
 * Boolean check whether a user has portal access to a specific project.
 *
 * Admins krijgen altijd `true` (preview-modus). Clients en members via
 * `portal_project_access`. Onbekende user → `false`.
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

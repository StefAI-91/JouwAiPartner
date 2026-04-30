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

export interface ProjectClient {
  profile_id: string;
  email: string;
  full_name: string | null;
  granted_at: string;
  last_sign_in_at: string | null;
}

/**
 * List clients met portal-access voor één project. Gebruikt vanuit cockpit
 * project-detail pagina om de "Klanten" sectie te vullen. Admin-only — caller
 * moet access enforcen voor invocatie.
 *
 * `last_sign_in_at` komt uit `auth.users` en vereist daarom de service-role
 * client; default-fallback naar admin-client wordt expliciet gedaan.
 */
export async function listPortalProjectClients(
  projectId: string,
  client?: SupabaseClient,
): Promise<ProjectClient[]> {
  if (!projectId) return [];

  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("portal_project_access")
    .select(`profile_id, created_at, profiles(email, full_name, role)`)
    .eq("project_id", projectId);

  if (error) {
    console.error("[listPortalProjectClients] Error:", error.message);
    return [];
  }

  type Row = {
    profile_id: string;
    created_at: string;
    profiles: { email: string; full_name: string | null; role: string } | null;
  };

  const rows = (data ?? []) as unknown as Row[];

  // Defense in depth: admins kunnen impliciet portal-toegang hebben zonder rij,
  // maar als er per ongeluk een access-rij voor een non-client bestaat tonen we
  // hem niet — anders zou een member tussen klanten verschijnen.
  const clientRows = rows.filter(
    (row): row is Row & { profiles: NonNullable<Row["profiles"]> } =>
      row.profiles !== null && row.profiles.role === "client",
  );

  if (clientRows.length === 0) return [];

  // Verrijk met last_sign_in_at uit auth.users — alleen via service role
  // beschikbaar. Caller is verantwoordelijk voor admin-context (zie comment).
  const adminClient = getAdminClient();
  const { data: authList } = await adminClient.auth.admin.listUsers();
  const lastSignInById = new Map(
    (authList?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null] as const),
  );

  return clientRows
    .map((row) => ({
      profile_id: row.profile_id,
      email: row.profiles.email,
      full_name: row.profiles.full_name,
      granted_at: row.created_at,
      last_sign_in_at: lastSignInById.get(row.profile_id) ?? null,
    }))
    .sort((a, b) => a.email.localeCompare(b.email));
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

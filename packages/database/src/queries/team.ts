import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export type TeamRole = "admin" | "member";
export type ProfileRole = "admin" | "member" | "client";

export interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: TeamRole;
  created_at: string;
}

export interface TeamMemberWithAccess extends TeamMember {
  project_access: Array<{ project_id: string; project_name: string | null }>;
}

/**
 * List all profiles (team members) with their role. Admin-only query — caller
 * must enforce access before invoking (e.g. via `requireAdmin()`).
 *
 * Clients (portal users) worden expliciet uitgefilterd: de admin-UI is enkel
 * voor internal team members. Clients worden beheerd via de portal-invite flow.
 */
export async function listTeamMembers(client?: SupabaseClient): Promise<TeamMember[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .in("role", ["admin", "member"])
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[listTeamMembers] error:", error.message);
    return [];
  }
  return (data ?? []) as TeamMember[];
}

/**
 * Fetch a single profile + its project-access rows (joined with project name).
 * Returns null when the profile does not exist.
 */
export async function getUserWithAccess(
  userId: string,
  client?: SupabaseClient,
): Promise<TeamMemberWithAccess | null> {
  const db = client ?? getAdminClient();

  const { data: profile, error: profileErr } = await db
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr || !profile) return null;

  // Clients horen niet in de devhub admin-UI; zelfs als de caller hun id door-
  // geeft: geen toegang via deze query.
  if (profile.role !== "admin" && profile.role !== "member") return null;

  const { data: access } = await db
    .from("devhub_project_access")
    .select("project_id, projects(name)")
    .eq("profile_id", userId);

  const project_access = (access ?? []).map((row) => ({
    project_id: row.project_id as string,
    // Supabase FK-join flattens to the related row; type escape kept local.
    project_name: (row as unknown as { projects: { name: string } | null }).projects?.name ?? null,
  }));

  return { ...(profile as TeamMember), project_access };
}

/**
 * Count the number of admins in the system. Used as defense-in-depth for the
 * min-1-admin rule (the DB trigger enforces it authoritatively; this helper
 * lets Server Actions return a user-friendly error instead of a raw DB error).
 */
export async function countAdmins(client?: SupabaseClient): Promise<number> {
  const db = client ?? getAdminClient();
  const { count, error } = await db
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  if (error) {
    console.error("[countAdmins] error:", error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * Fetch the role of a single profile. Returns `null` when the profile does not
 * exist. Used as a cheap lookup after a role-update to determine the effective
 * role for downstream side-effects.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function getProfileRole(
  userId: string,
  client?: SupabaseClient,
): Promise<ProfileRole | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (error) {
    console.error("[getProfileRole] error:", error.message);
    return null;
  }
  return (data?.role as ProfileRole | undefined) ?? null;
}

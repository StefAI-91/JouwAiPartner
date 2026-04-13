import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "member";
  created_at: string;
}

export interface TeamMemberWithAccess extends TeamMember {
  project_access: Array<{ project_id: string; project_name: string | null }>;
}

/**
 * List all profiles (team members) with their role. Admin-only query — caller
 * must enforce access before invoking (e.g. via `requireAdmin()`).
 */
export async function listTeamMembers(client?: SupabaseClient): Promise<TeamMember[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("profiles")
    .select("id, email, full_name, role, created_at")
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

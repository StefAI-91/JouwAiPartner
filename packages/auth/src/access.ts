import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@repo/database/supabase/admin";
import { createClient } from "@repo/database/supabase/server";
import { getAuthenticatedUser, isAuthBypassed } from "./helpers";

// Bypass-user ID uit helpers.ts — kunstmatig admin in dev-modus zodat lokale
// dev blijft werken zonder ingelogde Supabase-user. In productie (VERCEL_ENV
// === "production") is bypass uitgeschakeld.
const DEV_BYPASS_USER_ID = "00000000-0000-0000-0000-000000000000";

export class NotAuthorizedError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "NotAuthorizedError";
  }
}

type CurrentProfile = {
  id: string;
  role: "admin" | "member";
  email: string;
};

/**
 * Returns true iff `profiles.role = 'admin'` for the given user id.
 * - Default-deny: null/undefined/empty userId → false
 * - Dev bypass: the bypass user id is treated as admin so local dev keeps working
 * - On DB error: false (default-deny)
 */
export async function isAdmin(
  userId: string | null | undefined,
  client?: SupabaseClient,
): Promise<boolean> {
  if (!userId) return false;
  if (isAuthBypassed() && userId === DEV_BYPASS_USER_ID) return true;

  const db = client ?? getAdminClient();
  const { data, error } = await db.from("profiles").select("role").eq("id", userId).maybeSingle();

  if (error || !data) return false;
  return data.role === "admin";
}

/**
 * Returns the currently authenticated user's profile (id, email, role) or
 * null when no session exists or the profile is missing. Server-only.
 */
export async function getCurrentProfile(client?: SupabaseClient): Promise<CurrentProfile | null> {
  const user = await getAuthenticatedUser();
  if (!user?.id) return null;

  if (isAuthBypassed() && user.id === DEV_BYPASS_USER_ID) {
    return { id: user.id, role: "admin", email: user.email ?? "" };
  }

  const db = client ?? (await createClient());
  const { data, error } = await db
    .from("profiles")
    .select("id, role, email")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as CurrentProfile;
}

/**
 * Ensure the current user is an authenticated admin.
 * Redirects to `/login` (or `options.redirectTo`) when not authenticated or not admin.
 *
 * Use in Server Components / pages. For Server Actions prefer an explicit
 * `isAdmin()` check and return `{ error }` so the form stays in-place.
 */
export async function requireAdmin(options?: {
  redirectTo?: string;
}): Promise<{ id: string; email: string }> {
  const redirectTo = options?.redirectTo ?? "/login";
  const user = await getAuthenticatedUser();
  if (!user?.id) redirect(redirectTo);

  const admin = await isAdmin(user.id);
  if (!admin) redirect(redirectTo);

  return { id: user.id, email: user.email ?? "" };
}

/**
 * Assert that `userId` has access to `projectId`.
 * - No user → throws (default-deny, SEC-152)
 * - Admin → succeeds without touching `devhub_project_access`
 * - Member → succeeds only when a row in `devhub_project_access` exists
 *
 * Throws `NotAuthorizedError` otherwise. Callers can catch to render a 404
 * (see DH-016 / EDGE-150) instead of leaking existence via 403.
 */
export async function assertProjectAccess(
  userId: string | null | undefined,
  projectId: string,
  client?: SupabaseClient,
): Promise<void> {
  if (!userId) throw new NotAuthorizedError("No authenticated user");
  if (!projectId) throw new NotAuthorizedError("Missing project id");

  const db = client ?? getAdminClient();

  if (await isAdmin(userId, db)) return;

  const { data, error } = await db
    .from("devhub_project_access")
    .select("id")
    .eq("profile_id", userId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error || !data) {
    throw new NotAuthorizedError(`User ${userId} has no access to project ${projectId}`);
  }
}

/**
 * Convenience guard for Server Actions: ensures the current user is an admin.
 * Returns the user on success, or an action-friendly `{ error }` on failure.
 *
 * Use in cockpit actions and devhub admin-only actions to replace the boilerplate:
 *   const user = await getAuthenticatedUser();
 *   if (!user) return { error: "Niet ingelogd" };
 *   if (!(await isAdmin(user.id))) return { error: "Geen toegang" };
 */
export async function requireAdminInAction(): Promise<
  { user: { id: string; email: string } } | { error: string }
> {
  const user = await getAuthenticatedUser();
  if (!user?.id) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };
  return { user: { id: user.id, email: user.email ?? "" } };
}

/**
 * Returns the list of project IDs a user may access.
 * - Admin → all rows from `projects.id`
 * - Member → only IDs present in `devhub_project_access`
 * - No user / unknown user / empty access → `[]` (no bootstrap-fallback)
 */
export async function listAccessibleProjectIds(
  userId: string | null | undefined,
  client?: SupabaseClient,
): Promise<string[]> {
  if (!userId) return [];

  const db = client ?? getAdminClient();

  if (await isAdmin(userId, db)) {
    const { data, error } = await db.from("projects").select("id");
    if (error || !data) return [];
    return data.map((row) => row.id);
  }

  const { data, error } = await db
    .from("devhub_project_access")
    .select("project_id")
    .eq("profile_id", userId);

  if (error || !data) return [];
  return data.map((row) => row.project_id);
}

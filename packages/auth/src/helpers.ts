import { createClient } from "@repo/database/supabase/server";

/**
 * Returns the authenticated Supabase user, or null.
 * Use in Server Actions.
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Returns only the user ID, or null.
 * Use when you only need the ID (e.g., for ownership checks).
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const user = await getAuthenticatedUser();
  return user?.id ?? null;
}

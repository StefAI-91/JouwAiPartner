import { createClient } from "@repo/database/supabase/server";
import { getAdminClient } from "@repo/database/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Dev Auth Bypass ──
// WARNING: Development/preview only. Never enable in production.
// Set NEXT_PUBLIC_DEV_BYPASS_AUTH=true in your .env.local or Vercel preview env vars.
// Double-guarded: also requires VERCEL_ENV !== "production" (allows preview + local dev).

const DEV_BYPASS_USER = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "dev@jouwaipartner.nl",
  app_metadata: {},
  user_metadata: { full_name: "Dev Bypass User" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as const;

/**
 * Check if auth bypass is active.
 * Only true when BOTH conditions are met:
 *   1. NEXT_PUBLIC_DEV_BYPASS_AUTH === "true"
 *   2. VERCEL_ENV !== "production" (undefined locally = allowed, "preview" = allowed)
 */
export function isAuthBypassed(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true" && process.env.VERCEL_ENV !== "production"
  );
}

/**
 * Returns the authenticated Supabase user, or null.
 * In dev bypass mode, returns a fake user so Server Actions work without login.
 * Use in Server Actions.
 */
export async function getAuthenticatedUser() {
  if (isAuthBypassed()) {
    // Return a minimal User-like object that satisfies action auth checks
    return DEV_BYPASS_USER as unknown as Awaited<
      ReturnType<Awaited<ReturnType<typeof createClient>>["auth"]["getUser"]>
    >["data"]["user"];
  }

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

/**
 * Returns a Supabase client that works in both normal and bypass mode.
 * - Normal: returns the cookie-based server client (respects RLS per user session)
 * - Bypass: returns the admin/service-role client (skips RLS, sees all data)
 *
 * Use this in Server Components that need to fetch data.
 */
export async function createPageClient(): Promise<SupabaseClient> {
  if (isAuthBypassed()) {
    return getAdminClient();
  }
  return createClient();
}

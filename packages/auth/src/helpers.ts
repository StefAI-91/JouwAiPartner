import { createClient } from "@repo/database/supabase/server";

// ── Dev Auth Bypass ──
// WARNING: Development/preview only. Never enable in production.
// Set NEXT_PUBLIC_DEV_BYPASS_AUTH=true in your .env.local or Vercel preview env vars.
// Double-guarded: also requires NODE_ENV !== "production".

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
 *   2. NODE_ENV !== "production"
 */
export function isAuthBypassed(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true" && process.env.NODE_ENV !== "production"
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

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _testClient: SupabaseClient | null = null;

/**
 * Returns true when Supabase credentials are available.
 */
export function hasDbCredentials(): boolean {
  const url = process.env.TEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && key);
}

/**
 * Returns a Supabase admin client configured for the test database.
 * Uses TEST_SUPABASE_URL / TEST_SUPABASE_SERVICE_ROLE_KEY if set,
 * otherwise falls back to the standard env vars.
 */
export function getTestClient(): SupabaseClient {
  if (!_testClient) {
    const url = process.env.TEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        "Missing Supabase test env vars. Set TEST_SUPABASE_URL + TEST_SUPABASE_SERVICE_ROLE_KEY " +
          "or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.",
      );
    }

    // Safety: refuse to run tests against production-like URLs
    const isLocalhost =
      url.includes("localhost") || url.includes("127.0.0.1") || url.includes(".supabase.co");
    if (!isLocalhost && !process.env.TEST_SUPABASE_URL) {
      throw new Error(
        "Refusing to run tests: NEXT_PUBLIC_SUPABASE_URL does not look like a local/hosted Supabase instance. " +
          "Set TEST_SUPABASE_URL explicitly to confirm this is a test database.",
      );
    }

    _testClient = createClient(url, key);
  }
  return _testClient;
}

/**
 * Reset the cached test client (useful in afterAll).
 */
export function resetTestClient(): void {
  _testClient = null;
}

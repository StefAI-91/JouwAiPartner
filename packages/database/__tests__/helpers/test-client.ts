import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _testClient: SupabaseClient | null = null;

/**
 * Returns a Supabase admin client configured for the test database.
 * Uses TEST_SUPABASE_URL / TEST_SUPABASE_SERVICE_ROLE_KEY if set,
 * otherwise falls back to the standard env vars.
 */
export function getTestClient(): SupabaseClient {
  if (!_testClient) {
    const url =
      process.env.TEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        "Missing Supabase test env vars. Set TEST_SUPABASE_URL + TEST_SUPABASE_SERVICE_ROLE_KEY " +
          "or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.",
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

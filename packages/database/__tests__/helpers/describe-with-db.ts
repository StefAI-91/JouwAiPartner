import { describe } from "vitest";
import { hasDbCredentials } from "./test-client";

/**
 * Wrapper around `describe` that skips the entire suite when Supabase
 * credentials are not available. Use for integration tests that need
 * a real database connection.
 *
 * Tests will run when:
 * - TEST_SUPABASE_URL + TEST_SUPABASE_SERVICE_ROLE_KEY are set, OR
 * - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 *
 * Tests will skip (not fail) otherwise.
 */
export const describeWithDb: typeof describe = hasDbCredentials()
  ? describe
  : (describe.skip as unknown as typeof describe);

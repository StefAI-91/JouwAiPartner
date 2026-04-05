import { vi } from "vitest";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Mock `@repo/database/supabase/server` so that `createClient()` returns
 * a Supabase client with a controllable `auth.getUser()`.
 *
 * Two modes:
 * - `createServerMock()` — fully mocked client (unit tests)
 * - `createIntegrationServerMock()` — real DB client with mock auth (integration tests)
 */

let _mockUser: { id: string; email?: string } | null = null;

/**
 * Set the mock to return an authenticated user.
 */
export function mockAuthenticated(userId: string, email = "test@example.com") {
  _mockUser = { id: userId, email };
}

/**
 * Set the mock to return no user (unauthenticated).
 */
export function mockUnauthenticated() {
  _mockUser = null;
}

/**
 * Get the current mock user (for assertions).
 */
export function getMockUser() {
  return _mockUser;
}

/**
 * Create the vi.mock factory for `@repo/database/supabase/server`.
 * Returns a fully mocked client (no real DB). Good for unit tests.
 *
 * ```ts
 * vi.mock("@repo/database/supabase/server", () => createServerMock());
 * ```
 */
export function createServerMock() {
  return {
    createClient: vi.fn(async () => ({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: _mockUser },
          error: null,
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(async () => ({ data: null, error: null })),
      })),
    })),
  };
}

/**
 * Create the vi.mock factory for integration tests.
 * Returns a real Supabase client (using service role key) with mock auth layer.
 * This allows Server Actions to perform real DB operations against the test database.
 *
 * ```ts
 * vi.mock("@repo/database/supabase/server", () => createIntegrationServerMock());
 * ```
 */
export function createIntegrationServerMock() {
  const url = process.env.TEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    createClient: vi.fn(async () => {
      if (!url || !key) {
        throw new Error("Missing Supabase test env vars for integration tests");
      }
      const realClient = createSupabaseClient(url, key);
      return new Proxy(realClient, {
        get(target, prop) {
          if (prop === "auth") {
            return {
              getUser: vi.fn(async () => ({
                data: { user: _mockUser },
                error: null,
              })),
            };
          }
          return Reflect.get(target, prop);
        },
      });
    }),
  };
}

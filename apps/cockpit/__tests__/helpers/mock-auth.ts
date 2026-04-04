import { vi } from "vitest";

/**
 * Mock `@repo/database/supabase/server` so that `createClient()` returns
 * a fake Supabase client with a controllable `auth.getUser()`.
 *
 * Call this in your test file's top-level `vi.mock()` or in `beforeEach`.
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
 * Use this in your test file:
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

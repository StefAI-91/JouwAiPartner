import { vi } from "vitest";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let _mockUser: { id: string; email?: string } | null = null;

export function mockAuthenticated(userId: string, email = "test@example.com") {
  _mockUser = { id: userId, email };
}

export function mockUnauthenticated() {
  _mockUser = null;
}

export function getMockUser() {
  return _mockUser;
}

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
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn(async () => ({ data: null, error: null })),
      })),
    })),
  };
}

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

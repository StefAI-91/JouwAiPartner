import { describe, it, expect, vi, beforeEach } from "vitest";

// All three modules are mocked so `requireAdmin()` runs without Next.js or
// Supabase. Mocks are hoisted by vitest → applies before any imports.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`__REDIRECT__:${url}`);
  }),
}));

vi.mock("../src/helpers", async () => {
  const actual = await vi.importActual<typeof import("../src/helpers")>("../src/helpers");
  return {
    ...actual,
    getAuthenticatedUser: vi.fn(),
    isAuthBypassed: vi.fn(() => false),
  };
});

vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@repo/database/supabase/server", () => ({
  createClient: vi.fn(),
}));

function fakeClient(role: "admin" | "member" | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: role ? { role } : null,
            error: null,
          }),
        }),
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("requireAdmin()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects when no user is authenticated", async () => {
    const helpers = await import("../src/helpers");
    vi.mocked(helpers.getAuthenticatedUser).mockResolvedValueOnce(null);

    const { requireAdmin } = await import("../src/access");
    await expect(requireAdmin()).rejects.toThrow(/__REDIRECT__:\/login/);
  });

  it("redirects when user is not admin", async () => {
    const helpers = await import("../src/helpers");
    vi.mocked(helpers.getAuthenticatedUser).mockResolvedValueOnce({
      id: "member-id",
      email: "m@test.local",
    } as Awaited<ReturnType<typeof helpers.getAuthenticatedUser>>);

    const admin = await import("@repo/database/supabase/admin");
    vi.mocked(admin.getAdminClient).mockReturnValueOnce(fakeClient("member"));

    const { requireAdmin } = await import("../src/access");
    await expect(requireAdmin()).rejects.toThrow(/__REDIRECT__:\/login/);
  });

  it("honours the custom redirectTo option", async () => {
    const helpers = await import("../src/helpers");
    vi.mocked(helpers.getAuthenticatedUser).mockResolvedValueOnce(null);

    const { requireAdmin } = await import("../src/access");
    await expect(requireAdmin({ redirectTo: "/unauthorized" })).rejects.toThrow(
      /__REDIRECT__:\/unauthorized/,
    );
  });

  it("returns {id,email} for admin user", async () => {
    const helpers = await import("../src/helpers");
    vi.mocked(helpers.getAuthenticatedUser).mockResolvedValueOnce({
      id: "admin-id",
      email: "a@test.local",
    } as Awaited<ReturnType<typeof helpers.getAuthenticatedUser>>);

    const admin = await import("@repo/database/supabase/admin");
    vi.mocked(admin.getAdminClient).mockReturnValueOnce(fakeClient("admin"));

    const { requireAdmin } = await import("../src/access");
    await expect(requireAdmin()).resolves.toEqual({
      id: "admin-id",
      email: "a@test.local",
    });
  });
});

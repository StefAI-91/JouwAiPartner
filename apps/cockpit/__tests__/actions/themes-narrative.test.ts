import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * TH-014 — `regenerateThemeNarrativeAction` admin-guard + zod-validatie +
 * success-path. Boundary-mocks op auth-helpers, pipeline-step, next/cache.
 */

const mockUser = { value: null as { id: string; email?: string } | null };
const mockIsAdmin = vi.fn<(userId: string) => Promise<boolean>>();
const mockRunSynthesis =
  vi.fn<
    (
      themeId: string,
    ) => Promise<{ success: boolean; error?: string; skipped?: "insufficient_meetings" }>
  >();
const mockRevalidate = vi.fn();

vi.mock("@repo/auth/helpers", () => ({
  getAuthenticatedUser: vi.fn(async () => mockUser.value),
}));
vi.mock("@repo/auth/access", () => ({
  isAdmin: (...args: [string]) => mockIsAdmin(...args),
  requireAdminInAction: async () => {
    if (!mockUser.value?.id) return { error: "Niet ingelogd" };
    if (!(await mockIsAdmin(mockUser.value.id))) return { error: "Geen toegang" };
    return { user: { id: mockUser.value.id, email: mockUser.value.email ?? "" } };
  },
}));
vi.mock("@repo/ai/pipeline/steps/synthesize-theme-narrative", () => ({
  runThemeNarrativeSynthesis: (...args: Parameters<typeof mockRunSynthesis>) =>
    mockRunSynthesis(...args),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidate(...args),
}));

import { regenerateThemeNarrativeAction } from "@/features/themes/actions/narrative";

// Seed-UUID met version=0 / variant=0 — geldig UUID-shape, niet RFC-4122.
// Moet geaccepteerd worden door onze loose refine (niet door z.string().uuid()).
const SEED_THEME_ID = "d0000000-0000-0000-0000-000000000005";
const REAL_THEME_ID = "70e73ea0-4cd9-41de-9d2b-a36172ee31a1";

beforeEach(() => {
  vi.clearAllMocks();
  mockUser.value = null;
  mockIsAdmin.mockResolvedValue(false);
  mockRunSynthesis.mockResolvedValue({ success: true });
});

describe("regenerateThemeNarrativeAction — admin-guard", () => {
  it("returnt 'Niet ingelogd' zonder user", async () => {
    const result = await regenerateThemeNarrativeAction({ themeId: REAL_THEME_ID });
    expect(result).toEqual({ error: "Niet ingelogd" });
    expect(mockRunSynthesis).not.toHaveBeenCalled();
    expect(mockRevalidate).not.toHaveBeenCalled();
  });

  it("returnt 'Geen toegang' voor non-admin", async () => {
    mockUser.value = { id: "u-1" };
    mockIsAdmin.mockResolvedValue(false);

    const result = await regenerateThemeNarrativeAction({ themeId: REAL_THEME_ID });

    expect(result).toEqual({ error: "Geen toegang" });
    expect(mockRunSynthesis).not.toHaveBeenCalled();
  });
});

describe("regenerateThemeNarrativeAction — Zod-validatie", () => {
  it("weigert een themeId die niet UUID-vormig is", async () => {
    mockUser.value = { id: "u-1" };
    mockIsAdmin.mockResolvedValue(true);

    const result = await regenerateThemeNarrativeAction({ themeId: "not-a-uuid" });

    expect(result).toHaveProperty("error");
    expect(mockRunSynthesis).not.toHaveBeenCalled();
  });

  it("accepteert de niet-RFC-4122 seed-UUID (loose shape-check)", async () => {
    mockUser.value = { id: "u-1" };
    mockIsAdmin.mockResolvedValue(true);

    const result = await regenerateThemeNarrativeAction({ themeId: SEED_THEME_ID });

    expect(result).toEqual({ success: true });
    expect(mockRunSynthesis).toHaveBeenCalledWith(SEED_THEME_ID);
  });
});

describe("regenerateThemeNarrativeAction — success path", () => {
  beforeEach(() => {
    mockUser.value = { id: "u-1" };
    mockIsAdmin.mockResolvedValue(true);
  });

  it("roept de pipeline-step aan en revalidatet /themes", async () => {
    const result = await regenerateThemeNarrativeAction({ themeId: REAL_THEME_ID });

    expect(result).toEqual({ success: true });
    expect(mockRunSynthesis).toHaveBeenCalledWith(REAL_THEME_ID);
    expect(mockRevalidate).toHaveBeenCalledWith("/themes", "layout");
  });

  it("propageert skipped=insufficient_meetings terug naar de caller", async () => {
    mockRunSynthesis.mockResolvedValueOnce({
      success: true,
      skipped: "insufficient_meetings",
    });

    const result = await regenerateThemeNarrativeAction({ themeId: REAL_THEME_ID });

    expect(result).toEqual({ success: true, skipped: "insufficient_meetings" });
    expect(mockRevalidate).toHaveBeenCalled();
  });

  it("returnt error wanneer de pipeline-step faalt, zonder revalidate", async () => {
    mockRunSynthesis.mockResolvedValueOnce({ success: false, error: "anthropic 500" });

    const result = await regenerateThemeNarrativeAction({ themeId: REAL_THEME_ID });

    expect(result).toEqual({ error: "anthropic 500" });
    expect(mockRevalidate).not.toHaveBeenCalled();
  });
});

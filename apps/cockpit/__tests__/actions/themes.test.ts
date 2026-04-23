import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Boundary-mocks: we testen de whitelist-discipline en payload van de two
 * Server Actions zonder echte DB of Supabase. Mock-grens is de auth-helpers
 * (`getAuthenticatedUser` / `isAdmin`), de mutations en `next/cache`.
 */

const mockUser = { value: null as { id: string; email?: string } | null };
const mockIsAdmin = vi.fn<(userId: string) => Promise<boolean>>();
const mockUpdateTheme = vi.fn<(id: string, patch: Record<string, unknown>) => Promise<unknown>>();
const mockArchiveTheme = vi.fn<(id: string) => Promise<unknown>>();
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
const mockCreateVerifiedTheme = vi.fn<(input: Record<string, unknown>) => Promise<unknown>>();

vi.mock("@repo/database/mutations/themes", () => ({
  updateTheme: (...args: [string, Record<string, unknown>]) => mockUpdateTheme(...args),
  archiveTheme: (...args: [string]) => mockArchiveTheme(...args),
  createVerifiedTheme: (...args: [Record<string, unknown>]) => mockCreateVerifiedTheme(...args),
}));
vi.mock("@repo/database/queries/themes", () => ({
  getThemeBySlug: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidate(...args),
}));

import {
  updateThemeAction,
  archiveThemeAction,
  canEditThemesAction,
  createVerifiedThemeAction,
} from "../../src/actions/themes";

// Must be a valid v4 UUID (zod v4 validates strict RFC format)
const THEME_ID = "11111111-1111-4111-8111-111111111111";
const VALID_INPUT = {
  themeId: THEME_ID,
  name: "Team capaciteit & hiring",
  description: "Over hiring + rolverdeling.",
  matchingGuide:
    "Valt onder als het over vacatures, hiring of rolverdeling gaat. Valt er niet onder als het persoonlijke werkdruk betreft.",
  emoji: "👥" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUser.value = null;
  mockIsAdmin.mockResolvedValue(false);
  mockUpdateTheme.mockResolvedValue({ success: true });
  mockArchiveTheme.mockResolvedValue({ success: true });
  mockCreateVerifiedTheme.mockResolvedValue({
    success: true,
    id: "22222222-2222-4222-8222-222222222222",
    slug: "team-capaciteit",
  });
});

describe("updateThemeAction — whitelist", () => {
  it("returnt 'Niet ingelogd' wanneer er geen ingelogde gebruiker is", async () => {
    mockUser.value = null;
    const result = await updateThemeAction(VALID_INPUT);
    expect(result).toEqual({ error: "Niet ingelogd" });
    expect(mockUpdateTheme).not.toHaveBeenCalled();
  });

  it("returnt 'Geen toegang' voor een non-admin gebruiker", async () => {
    mockUser.value = { id: "u-1", email: "ege@example.com" };
    mockIsAdmin.mockResolvedValue(false);
    const result = await updateThemeAction(VALID_INPUT);
    expect(result).toEqual({ error: "Geen toegang" });
    expect(mockUpdateTheme).not.toHaveBeenCalled();
  });

  it("roept updateTheme aan + revalidate wanneer user admin is", async () => {
    mockUser.value = { id: "stef-id", email: "stef@jaip" };
    mockIsAdmin.mockResolvedValue(true);
    const result = await updateThemeAction(VALID_INPUT);
    expect(result).toEqual({ success: true });
    expect(mockUpdateTheme).toHaveBeenCalledWith(THEME_ID, {
      name: VALID_INPUT.name,
      description: VALID_INPUT.description,
      // Action mapt client-side camelCase → DB snake_case.
      matching_guide: VALID_INPUT.matchingGuide,
      emoji: VALID_INPUT.emoji,
    });
    expect(mockRevalidate).toHaveBeenCalledWith("/");
  });
});

describe("updateThemeAction — Zod validatie", () => {
  beforeEach(() => {
    mockUser.value = { id: "admin-id" };
    mockIsAdmin.mockResolvedValue(true);
  });

  it("weigert een te korte name", async () => {
    const result = await updateThemeAction({ ...VALID_INPUT, name: "A" });
    // TH-009: Zod-fails geven field-error message terug i.p.v. generiek "Invalid input".
    expect("error" in result && typeof result.error === "string").toBe(true);
    expect(mockUpdateTheme).not.toHaveBeenCalled();
  });

  it("weigert een matchingGuide korter dan 20 chars", async () => {
    const result = await updateThemeAction({ ...VALID_INPUT, matchingGuide: "te kort" });
    expect("error" in result && typeof result.error === "string").toBe(true);
  });

  it("weigert een emoji buiten de THEME_EMOJIS shortlist", async () => {
    const result = await updateThemeAction({
      ...VALID_INPUT,
      // @ts-expect-error — bewust type-breaker voor de test
      emoji: "😅",
    });
    expect("error" in result && typeof result.error === "string").toBe(true);
  });

  it("geeft DB-error door als mutation faalt", async () => {
    mockUpdateTheme.mockResolvedValue({ error: "db down" });
    const result = await updateThemeAction(VALID_INPUT);
    expect(result).toEqual({ error: "db down" });
  });
});

describe("archiveThemeAction", () => {
  it("weigert non-admin", async () => {
    mockUser.value = { id: "u-1" };
    mockIsAdmin.mockResolvedValue(false);
    const result = await archiveThemeAction({ themeId: THEME_ID });
    expect(result).toEqual({ error: "Geen toegang" });
    expect(mockArchiveTheme).not.toHaveBeenCalled();
  });

  it("roept archiveTheme aan voor admin", async () => {
    mockUser.value = { id: "admin" };
    mockIsAdmin.mockResolvedValue(true);
    const result = await archiveThemeAction({ themeId: THEME_ID });
    expect(result).toEqual({ success: true });
    expect(mockArchiveTheme).toHaveBeenCalledWith(THEME_ID);
    expect(mockRevalidate).toHaveBeenCalledWith("/");
  });

  it("valideert themeId als uuid", async () => {
    mockUser.value = { id: "admin" };
    mockIsAdmin.mockResolvedValue(true);
    const result = await archiveThemeAction({ themeId: "not-a-uuid" });
    expect("error" in result && typeof result.error === "string").toBe(true);
    expect(mockArchiveTheme).not.toHaveBeenCalled();
  });
});

describe("canEditThemesAction", () => {
  it("false zonder user", async () => {
    mockUser.value = null;
    const result = await canEditThemesAction();
    expect(result).toEqual({ canEdit: false });
  });

  it("false voor non-admin user", async () => {
    mockUser.value = { id: "u-1" };
    mockIsAdmin.mockResolvedValue(false);
    const result = await canEditThemesAction();
    expect(result).toEqual({ canEdit: false });
  });

  it("true voor admin user", async () => {
    mockUser.value = { id: "stef" };
    mockIsAdmin.mockResolvedValue(true);
    const result = await canEditThemesAction();
    expect(result).toEqual({ canEdit: true });
  });
});

describe("createVerifiedThemeAction (TH-010)", () => {
  const VALID_CREATE = {
    name: "Klantonboarding",
    description: "Inwerken van nieuwe klanten na contract.",
    matchingGuide:
      "Valt onder als het gaat over onboarding-traject, kickoff-meetings of account-setup. Valt er niet onder als het alleen over sales-proces gaat.",
    emoji: "📋" as const,
  };

  it("weigert non-admin met 'Geen toegang'", async () => {
    mockUser.value = { id: "u-member" };
    mockIsAdmin.mockResolvedValue(false);
    const result = await createVerifiedThemeAction(VALID_CREATE);
    expect(result).toEqual({ error: "Geen toegang" });
    expect(mockCreateVerifiedTheme).not.toHaveBeenCalled();
  });

  it("weigert ongeldige input zonder DB-call", async () => {
    mockUser.value = { id: "stef" };
    mockIsAdmin.mockResolvedValue(true);
    const result = await createVerifiedThemeAction({
      ...VALID_CREATE,
      matchingGuide: "te kort",
    });
    expect("error" in result).toBe(true);
    expect(mockCreateVerifiedTheme).not.toHaveBeenCalled();
  });

  it("admin: mutation krijgt verifiedBy + revalidate gedraaid", async () => {
    mockUser.value = { id: "stef-id", email: "stef@jaip" };
    mockIsAdmin.mockResolvedValue(true);
    const result = await createVerifiedThemeAction(VALID_CREATE);
    expect("success" in result && result.success).toBe(true);
    expect(mockCreateVerifiedTheme).toHaveBeenCalledWith(
      expect.objectContaining({
        name: VALID_CREATE.name,
        description: VALID_CREATE.description,
        matching_guide: VALID_CREATE.matchingGuide,
        emoji: VALID_CREATE.emoji,
        verifiedBy: "stef-id",
      }),
    );
    expect(mockRevalidate).toHaveBeenCalledWith("/");
    expect(mockRevalidate).toHaveBeenCalledWith("/review");
  });

  it("geeft mutation-error door (slug-collision etc.)", async () => {
    mockUser.value = { id: "stef" };
    mockIsAdmin.mockResolvedValue(true);
    mockCreateVerifiedTheme.mockResolvedValue({
      error: "duplicate key value violates unique constraint",
    });
    const result = await createVerifiedThemeAction(VALID_CREATE);
    expect(result).toEqual({
      error: "duplicate key value violates unique constraint",
    });
  });
});

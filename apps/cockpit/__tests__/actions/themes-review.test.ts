import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * TH-006 Server Action tests — whitelist-discipline + payload-capture +
 * EDGE cases voor de review-flow (approve / reject emerging / reject match /
 * regenerate). Mock-grens: auth helpers + mutations + queries + pipeline
 * step + next/cache.
 */

const mockUser = { value: null as { id: string; email?: string } | null };
const mockIsAdmin = vi.fn<(userId: string) => Promise<boolean>>();
const mockUpdateTheme = vi.fn<(id: string, patch: Record<string, unknown>) => Promise<unknown>>();
const mockArchiveTheme = vi.fn<(id: string) => Promise<unknown>>();
const mockRejectMatch = vi.fn<(input: Record<string, unknown>) => Promise<unknown>>();
const mockRecalc = vi.fn<(ids: string[]) => Promise<unknown>>();
const mockGetMeeting = vi.fn<(id: string) => Promise<unknown>>();
const mockRunTagThemes = vi.fn<(input: Record<string, unknown>) => Promise<unknown>>();
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
vi.mock("@repo/database/mutations/themes", () => ({
  updateTheme: (...args: [string, Record<string, unknown>]) => mockUpdateTheme(...args),
  archiveTheme: (...args: [string]) => mockArchiveTheme(...args),
}));
vi.mock("@repo/database/mutations/meeting-themes", () => ({
  rejectThemeMatchAsAdmin: (...args: [Record<string, unknown>]) => mockRejectMatch(...args),
  recalculateThemeStats: (...args: [string[]]) => mockRecalc(...args),
}));
vi.mock("@repo/database/queries/themes", () => ({
  getThemeBySlug: vi.fn(),
}));
vi.mock("@repo/database/queries/meetings", () => ({
  getVerifiedMeetingById: (...args: [string]) => mockGetMeeting(...args),
}));
vi.mock("@repo/ai/pipeline/steps/tag-themes", () => ({
  runTagThemesStep: (...args: [Record<string, unknown>]) => mockRunTagThemes(...args),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidate(...args),
}));

import {
  approveThemeAction,
  rejectEmergingThemeAction,
  rejectThemeMatchAction,
  regenerateMeetingThemesAction,
} from "../../src/actions/themes";

const THEME_ID = "11111111-1111-4111-8111-111111111111";
const MEETING_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";

const VALID_APPROVE = {
  themeId: THEME_ID,
  name: "Team capaciteit & hiring",
  description: "Rolverdeling en openstaande vacatures.",
  matchingGuide:
    "Valt onder als het over hiring gaat. Valt er niet onder als het over werkdruk gaat.",
  emoji: "👥" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUser.value = null;
  mockIsAdmin.mockResolvedValue(false);
  mockUpdateTheme.mockResolvedValue({ success: true });
  mockArchiveTheme.mockResolvedValue({ success: true });
  mockRejectMatch.mockResolvedValue({ success: true, alreadyRemoved: false });
  mockRecalc.mockResolvedValue({ success: true });
  mockGetMeeting.mockResolvedValue({ id: MEETING_ID, title: "Test", summary: "Summary" });
  mockRunTagThemes.mockResolvedValue({
    success: true,
    matches_saved: 2,
    proposals_saved: 0,
    themes_considered: 5,
    error: null,
  });
});

// ──────────────────────────────────────────────────────────────────────────
// approveThemeAction
// ──────────────────────────────────────────────────────────────────────────

describe("approveThemeAction", () => {
  it("weigert non-admin", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(false);
    const result = await approveThemeAction(VALID_APPROVE);
    expect(result).toEqual({ error: "Geen toegang" });
    expect(mockUpdateTheme).not.toHaveBeenCalled();
  });

  it("zet status=verified + verified_at/verified_by voor admin", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    const result = await approveThemeAction(VALID_APPROVE);
    expect(result).toEqual({ success: true });
    const [id, patch] = mockUpdateTheme.mock.calls[0];
    expect(id).toBe(THEME_ID);
    expect(patch).toMatchObject({
      name: VALID_APPROVE.name,
      description: VALID_APPROVE.description,
      // Action mapt client-side camelCase → DB snake_case (TH-009).
      matching_guide: VALID_APPROVE.matchingGuide,
      emoji: VALID_APPROVE.emoji,
      status: "verified",
      verified_by: USER_ID,
    });
    expect(patch.verified_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(mockRevalidate).toHaveBeenCalledWith("/review");
    expect(mockRevalidate).toHaveBeenCalledWith("/");
  });

  it("weigert bij Zod-fail (te korte matchingGuide)", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    const result = await approveThemeAction({ ...VALID_APPROVE, matchingGuide: "kort" });
    // TH-009: Zod fail geeft field-error i.p.v. generiek "Invalid input".
    expect("error" in result && typeof result.error === "string").toBe(true);
    expect(mockUpdateTheme).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// rejectEmergingThemeAction
// ──────────────────────────────────────────────────────────────────────────

describe("rejectEmergingThemeAction", () => {
  it("weigert non-admin", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(false);
    const result = await rejectEmergingThemeAction({ themeId: THEME_ID });
    expect(result).toEqual({ error: "Geen toegang" });
    expect(mockArchiveTheme).not.toHaveBeenCalled();
  });

  it("roept archiveTheme aan voor admin", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    const result = await rejectEmergingThemeAction({ themeId: THEME_ID });
    expect(result).toEqual({ success: true });
    expect(mockArchiveTheme).toHaveBeenCalledWith(THEME_ID);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// rejectThemeMatchAction
// ──────────────────────────────────────────────────────────────────────────

describe("rejectThemeMatchAction", () => {
  it("weigert non-admin", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(false);
    const result = await rejectThemeMatchAction({
      meetingId: MEETING_ID,
      themeId: THEME_ID,
      reason: "ander_thema",
    });
    expect(result).toEqual({ error: "Geen toegang" });
    expect(mockRejectMatch).not.toHaveBeenCalled();
  });

  it("geeft reason + userId door aan de mutation en recalc stats", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    const result = await rejectThemeMatchAction({
      meetingId: MEETING_ID,
      themeId: THEME_ID,
      reason: "ander_thema",
    });
    expect(result).toEqual({ success: true, alreadyRemoved: false });
    expect(mockRejectMatch).toHaveBeenCalledWith({
      meetingId: MEETING_ID,
      themeId: THEME_ID,
      reason: "ander_thema",
      userId: USER_ID,
    });
    expect(mockRecalc).toHaveBeenCalledWith([THEME_ID]);
  });

  it("slaat recalc over als de match al verwijderd was (EDGE-211 idempotent)", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    mockRejectMatch.mockResolvedValue({ success: true, alreadyRemoved: true });

    const result = await rejectThemeMatchAction({
      meetingId: MEETING_ID,
      themeId: THEME_ID,
      reason: "te_breed",
    });
    expect(result).toEqual({ success: true, alreadyRemoved: true });
    expect(mockRecalc).not.toHaveBeenCalled();
  });

  it("weigert een onbekende reden (Zod enum)", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    const result = await rejectThemeMatchAction({
      meetingId: MEETING_ID,
      themeId: THEME_ID,
      // @ts-expect-error — bewust type-breaker voor de test
      reason: "onzin",
    });
    // TH-009: Zod fail geeft field-error i.p.v. generiek "Invalid input".
    expect("error" in result && typeof result.error === "string").toBe(true);
    expect(mockRejectMatch).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// regenerateMeetingThemesAction
// ──────────────────────────────────────────────────────────────────────────

describe("regenerateMeetingThemesAction", () => {
  it("weigert non-admin", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(false);
    const result = await regenerateMeetingThemesAction({ meetingId: MEETING_ID });
    expect(result).toEqual({ error: "Geen toegang" });
    expect(mockRunTagThemes).not.toHaveBeenCalled();
  });

  it("roept runTagThemesStep aan met replace=true", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    const result = await regenerateMeetingThemesAction({ meetingId: MEETING_ID });
    expect(result).toMatchObject({ success: true, matches: 2, proposals: 0 });
    expect(mockRunTagThemes).toHaveBeenCalledWith({
      meetingId: MEETING_ID,
      meetingTitle: "Test",
      summary: "Summary",
      replace: true,
    });
    expect(mockRevalidate).toHaveBeenCalledWith(`/meetings/${MEETING_ID}`);
  });

  it("fout wanneer meeting niet gevonden", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    mockGetMeeting.mockResolvedValue(null);
    const result = await regenerateMeetingThemesAction({ meetingId: MEETING_ID });
    expect(result).toEqual({ error: "Meeting niet gevonden of niet verified" });
    expect(mockRunTagThemes).not.toHaveBeenCalled();
  });

  it("geeft step-error door", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    mockRunTagThemes.mockResolvedValue({
      success: false,
      matches_saved: 0,
      proposals_saved: 0,
      themes_considered: 0,
      error: "agent crashed",
    });
    const result = await regenerateMeetingThemesAction({ meetingId: MEETING_ID });
    expect(result).toEqual({ error: "agent crashed" });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * TH-011 (FUNC-280, SEC-230) — confirmThemeProposalAction en
 * rejectThemeProposalAction tests. Boundary-mocks: auth + mutations +
 * next/cache. Assert op (a) admin-guard, (b) payload naar mutations,
 * (c) alle revalidate-paths voor synchrone bulk+per-meeting-tab refresh.
 */

const mockUser = { value: null as { id: string; email?: string } | null };
const mockIsAdmin = vi.fn<(userId: string) => Promise<boolean>>();
const mockUpdateTheme = vi.fn<(id: string, patch: Record<string, unknown>) => Promise<unknown>>();
const mockArchiveTheme = vi.fn<(id: string) => Promise<unknown>>();
const mockRejectMatch = vi.fn<(input: Record<string, unknown>) => Promise<unknown>>();
const mockRecalc = vi.fn<(ids: string[]) => Promise<unknown>>();
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
  createVerifiedTheme: vi.fn(),
}));
vi.mock("@repo/database/mutations/meeting-themes", () => ({
  rejectThemeMatchAsAdmin: (...args: [Record<string, unknown>]) => mockRejectMatch(...args),
  recalculateThemeStats: (...args: [string[]]) => mockRecalc(...args),
}));
vi.mock("@repo/database/queries/themes", () => ({
  getThemeBySlug: vi.fn(),
}));
vi.mock("@repo/database/queries/meetings", () => ({
  getVerifiedMeetingById: vi.fn(),
}));
vi.mock("@repo/ai/pipeline/steps/theme-detector", () => ({
  runThemeDetectorStep: vi.fn(),
}));
vi.mock("@repo/ai/pipeline/steps/link-themes", () => ({
  runLinkThemesStep: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidate(...args),
}));

import { confirmThemeProposalAction, rejectThemeProposalAction } from "../../src/actions/themes";

const THEME_ID = "11111111-1111-4111-8111-111111111111";
const MEETING_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.clearAllMocks();
  mockUser.value = null;
  mockIsAdmin.mockResolvedValue(false);
  mockUpdateTheme.mockResolvedValue({ success: true });
  mockArchiveTheme.mockResolvedValue({ success: true });
  mockRejectMatch.mockResolvedValue({ success: true, alreadyRemoved: false });
  mockRecalc.mockResolvedValue({ success: true });
});

describe("confirmThemeProposalAction (TH-011 FUNC-280)", () => {
  it("weigert non-admin", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(false);
    const result = await confirmThemeProposalAction({ themeId: THEME_ID, meetingId: MEETING_ID });
    expect(result).toEqual({ error: "Geen toegang" });
    expect(mockUpdateTheme).not.toHaveBeenCalled();
  });

  it("zet status=verified + verified_at + verified_by voor admin", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    const result = await confirmThemeProposalAction({ themeId: THEME_ID, meetingId: MEETING_ID });
    expect(result).toEqual({ success: true });
    expect(mockUpdateTheme).toHaveBeenCalledOnce();
    const [id, patch] = mockUpdateTheme.mock.calls[0];
    expect(id).toBe(THEME_ID);
    expect(patch).toMatchObject({
      status: "verified",
      verified_by: USER_ID,
    });
    expect(patch.verified_at).toEqual(expect.any(String));
  });

  it("revalidate alle proposal-surfaces (bulk + per-meeting + themes + home)", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    await confirmThemeProposalAction({ themeId: THEME_ID, meetingId: MEETING_ID });
    expect(mockRevalidate).toHaveBeenCalledWith("/review");
    expect(mockRevalidate).toHaveBeenCalledWith(`/review/${MEETING_ID}`);
    expect(mockRevalidate).toHaveBeenCalledWith("/themes");
    expect(mockRevalidate).toHaveBeenCalledWith("/");
  });

  it("geeft mutation-error door", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    mockUpdateTheme.mockResolvedValue({ error: "db down" });
    const result = await confirmThemeProposalAction({ themeId: THEME_ID, meetingId: MEETING_ID });
    expect(result).toEqual({ error: "db down" });
  });
});

describe("rejectThemeProposalAction (TH-011 FUNC-280)", () => {
  it("weigert non-admin", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(false);
    const result = await rejectThemeProposalAction({ themeId: THEME_ID, meetingId: MEETING_ID });
    expect(result).toEqual({ error: "Geen toegang" });
    expect(mockArchiveTheme).not.toHaveBeenCalled();
  });

  it("archiveer + cleanup meeting_themes + recalc stats voor admin", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    const result = await rejectThemeProposalAction({ themeId: THEME_ID, meetingId: MEETING_ID });
    expect(result).toEqual({ success: true });
    expect(mockArchiveTheme).toHaveBeenCalledWith(THEME_ID);
    expect(mockRejectMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        meetingId: MEETING_ID,
        themeId: THEME_ID,
        userId: USER_ID,
      }),
    );
    expect(mockRecalc).toHaveBeenCalledWith([THEME_ID]);
  });

  it("stopt bij archive-error voordat meeting_themes cleanup draait", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    mockArchiveTheme.mockResolvedValue({ error: "archive boom" });
    const result = await rejectThemeProposalAction({ themeId: THEME_ID, meetingId: MEETING_ID });
    expect(result).toEqual({ error: "archive boom" });
    expect(mockRejectMatch).not.toHaveBeenCalled();
  });

  it("revalidate alle proposal-surfaces", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    await rejectThemeProposalAction({ themeId: THEME_ID, meetingId: MEETING_ID });
    expect(mockRevalidate).toHaveBeenCalledWith("/review");
    expect(mockRevalidate).toHaveBeenCalledWith(`/review/${MEETING_ID}`);
    expect(mockRevalidate).toHaveBeenCalledWith("/themes");
    expect(mockRevalidate).toHaveBeenCalledWith("/");
  });
});

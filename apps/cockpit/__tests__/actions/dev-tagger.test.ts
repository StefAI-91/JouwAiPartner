import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Boundary-mocks: `/dev/tagger`-action orkestreert auth + queries + de agent
 * en mag géén DB writes doen. We mocken de grenzen en asserten dat:
 *  - admin-only guard werkt (whitelist-discipline, SEC-220);
 *  - de dry-run nergens naar `linkMeetingToThemes`, `linkExtractionsToThemes`,
 *    of `clearExtractionThemesForMeeting` gaat;
 *  - de return-shape `taggerOutput / currentMeetingThemes /
 *    currentExtractionThemes / systemPrompt` klopt.
 */

const mockUser = { value: null as { id: string; email?: string } | null };
const mockIsAdmin = vi.fn<(userId: string) => Promise<boolean>>();
const mockGetMeeting = vi.fn();
const mockGetExtractions = vi.fn();
const mockListThemes = vi.fn();
const mockGetMeetingThemes = vi.fn();
const mockGetExtractionThemes = vi.fn();
const mockTag = vi.fn();

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
vi.mock("@repo/database/queries/meetings", () => ({
  getVerifiedMeetingById: (...args: unknown[]) => mockGetMeeting(...args),
  getMeetingExtractions: (...args: unknown[]) => mockGetExtractions(...args),
}));
vi.mock("@repo/database/queries/themes", () => ({
  listVerifiedThemes: (...args: unknown[]) => mockListThemes(...args),
}));
vi.mock("@repo/database/queries/dev-tagger", () => ({
  getMeetingThemesForDevTagger: (...args: unknown[]) => mockGetMeetingThemes(...args),
  getExtractionThemesForDevTagger: (...args: unknown[]) => mockGetExtractionThemes(...args),
}));
vi.mock("@repo/ai/agents/theme-tagger", () => ({
  tagMeetingThemes: (...args: unknown[]) => mockTag(...args),
  THEME_TAGGER_SYSTEM_PROMPT: "SYSTEM PROMPT FOR TESTING",
}));
vi.mock("@repo/database/mutations/meeting-themes", () => ({
  linkMeetingToThemes: vi.fn(() => {
    throw new Error("linkMeetingToThemes must not be called in dry-run");
  }),
}));
vi.mock("@repo/database/mutations/extraction-themes", () => ({
  linkExtractionsToThemes: vi.fn(() => {
    throw new Error("linkExtractionsToThemes must not be called in dry-run");
  }),
  clearExtractionThemesForMeeting: vi.fn(() => {
    throw new Error("clearExtractionThemesForMeeting must not be called in dry-run");
  }),
}));

import { runDevTaggerAction } from "../../src/actions/dev-tagger";

const MEETING_ID = "11111111-1111-4111-8111-111111111111";
const EXTRACTION_NEED = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const EXTRACTION_INSIGHT = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const THEME_ID = "cccccccc-3333-4333-8333-cccccccccccc";

beforeEach(() => {
  vi.clearAllMocks();
  mockUser.value = null;
  mockIsAdmin.mockResolvedValue(false);
  mockGetMeeting.mockResolvedValue({
    id: MEETING_ID,
    title: "Founders sync",
    summary: "sommige summary",
  });
  mockGetExtractions.mockResolvedValue([
    { id: EXTRACTION_NEED, type: "need", content: "twee junior devs werven" },
    { id: EXTRACTION_INSIGHT, type: "insight", content: "Stef voelt zich kapot" },
    { id: "context-id", type: "context", content: "context moet uitgefilterd" },
  ]);
  mockListThemes.mockResolvedValue([
    {
      id: THEME_ID,
      slug: "hiring",
      name: "Hiring",
      emoji: "👥",
      description: "desc",
      matching_guide: "guide",
      status: "verified",
      negative_examples: [
        {
          theme_id: THEME_ID,
          meeting_id: "other",
          evidence_quote: "neg quote",
          reason: "te_breed" as const,
          rejected_at: "2026-04-15T00:00:00Z",
        },
      ],
    },
  ]);
  mockGetMeetingThemes.mockResolvedValue([]);
  mockGetExtractionThemes.mockResolvedValue([]);
  mockTag.mockResolvedValue({
    matches: [
      {
        themeId: THEME_ID,
        confidence: "high",
        evidenceQuote: "quote",
        extractionIds: [EXTRACTION_NEED],
      },
    ],
    proposals: [],
    meta: { themesConsidered: 1 },
  });
});

describe("runDevTaggerAction — whitelist (SEC-220)", () => {
  it("returnt 'Niet ingelogd' zonder session", async () => {
    mockUser.value = null;
    const result = await runDevTaggerAction({ meetingId: MEETING_ID });
    expect(result).toEqual({ error: "Niet ingelogd" });
    expect(mockTag).not.toHaveBeenCalled();
  });

  it("returnt 'Geen toegang' voor non-admin", async () => {
    mockUser.value = { id: "u-member", email: "member@jaip" };
    mockIsAdmin.mockResolvedValue(false);
    const result = await runDevTaggerAction({ meetingId: MEETING_ID });
    expect(result).toEqual({ error: "Geen toegang" });
    expect(mockTag).not.toHaveBeenCalled();
  });
});

describe("runDevTaggerAction — dry-run", () => {
  beforeEach(() => {
    mockUser.value = { id: "stef-id", email: "stef@jaip" };
    mockIsAdmin.mockResolvedValue(true);
  });

  it("roept tagMeetingThemes aan met type-gefilterde extractions (AI-226)", async () => {
    await runDevTaggerAction({ meetingId: MEETING_ID });
    const taggerCall = mockTag.mock.calls[0][0];
    const extractionIds = taggerCall.meeting.extractions.map((e: { id: string }) => e.id);
    expect(extractionIds).toEqual([EXTRACTION_NEED, EXTRACTION_INSIGHT]);
    expect(extractionIds).not.toContain("context-id");
  });

  it("retourneert taggerOutput + current-state + systemPrompt", async () => {
    mockGetMeetingThemes.mockResolvedValue([
      {
        theme_id: THEME_ID,
        theme_name: "Hiring",
        theme_emoji: "👥",
        confidence: "medium",
        evidence_quote: "db quote",
        created_at: "2026-04-20T00:00:00Z",
      },
    ]);
    mockGetExtractionThemes.mockResolvedValue([
      {
        extraction_id: EXTRACTION_NEED,
        theme_id: THEME_ID,
        confidence: "medium",
        extraction_type: "need",
        extraction_content: "twee junior devs werven",
      },
    ]);

    const result = await runDevTaggerAction({ meetingId: MEETING_ID });
    if ("error" in result) throw new Error(result.error);

    expect(result.taggerOutput.matches).toHaveLength(1);
    expect(result.currentMeetingThemes).toHaveLength(1);
    expect(result.currentExtractionThemes).toHaveLength(1);
    expect(result.systemPrompt).toBe("SYSTEM PROMPT FOR TESTING");
    expect(result.inputSummary).toMatchObject({
      meetingId: MEETING_ID,
      extractionsTotal: 3,
      extractionsAfterTypeFilter: 2,
      themesCount: 1,
      negativeExamplesCount: 1,
    });
  });

  it("error wanneer meeting niet verified/bestaat", async () => {
    mockGetMeeting.mockResolvedValue(null);
    const result = await runDevTaggerAction({ meetingId: MEETING_ID });
    expect(result).toMatchObject({ error: expect.stringContaining("niet gevonden") });
    expect(mockTag).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Boundary-mocks: de step orkestreert DB-queries, de agent-call en DB-
 * mutations. We mocken die grenzen en asserten op:
 *  - welke input de agent krijgt (payload-capture),
 *  - hoe de step de EDGE-cases afhandelt (geen extractions, geen themes,
 *    agent-throw),
 *  - of de persistence correct wordt aangeroepen met de juiste argumenten.
 */

vi.mock("@repo/database/queries/meetings", () => ({
  getMeetingExtractions: vi.fn(),
}));
vi.mock("@repo/database/queries/themes", () => ({
  listVerifiedThemes: vi.fn(),
}));
vi.mock("@repo/database/mutations/meeting-themes", () => ({
  linkMeetingToThemes: vi.fn(),
  recalculateThemeStats: vi.fn(),
  clearMeetingThemes: vi.fn(),
}));
vi.mock("@repo/database/mutations/extraction-themes", () => ({
  linkExtractionsToThemes: vi.fn(),
  clearExtractionThemesForMeeting: vi.fn(),
}));
vi.mock("@repo/database/mutations/themes", () => ({
  createEmergingTheme: vi.fn(),
}));
vi.mock("../../src/agents/theme-tagger", () => ({
  tagMeetingThemes: vi.fn(),
}));

import { getMeetingExtractions } from "@repo/database/queries/meetings";
import { listVerifiedThemes } from "@repo/database/queries/themes";
import {
  linkMeetingToThemes,
  recalculateThemeStats,
  clearMeetingThemes,
} from "@repo/database/mutations/meeting-themes";
import {
  linkExtractionsToThemes,
  clearExtractionThemesForMeeting,
} from "@repo/database/mutations/extraction-themes";
import { createEmergingTheme } from "@repo/database/mutations/themes";
import { tagMeetingThemes } from "../../src/agents/theme-tagger";
import { runTagThemesStep } from "../../src/pipeline/steps/tag-themes";

const mockGetExtractions = getMeetingExtractions as unknown as ReturnType<typeof vi.fn>;
const mockListThemes = listVerifiedThemes as unknown as ReturnType<typeof vi.fn>;
const mockLink = linkMeetingToThemes as unknown as ReturnType<typeof vi.fn>;
const mockCreate = createEmergingTheme as unknown as ReturnType<typeof vi.fn>;
const mockRecalc = recalculateThemeStats as unknown as ReturnType<typeof vi.fn>;
const mockClear = clearMeetingThemes as unknown as ReturnType<typeof vi.fn>;
const mockLinkExtractions = linkExtractionsToThemes as unknown as ReturnType<typeof vi.fn>;
const mockClearExtractions = clearExtractionThemesForMeeting as unknown as ReturnType<typeof vi.fn>;
const mockTag = tagMeetingThemes as unknown as ReturnType<typeof vi.fn>;

const THEME_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const THEME_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const MEETING_ID = "11111111-2222-3333-4444-555555555555";
const EXTRACTION_A = "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const EXTRACTION_B = "22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function theme(id: string, name = "Team capaciteit & hiring") {
  return {
    id,
    slug: "team-capaciteit-hiring",
    name,
    emoji: "👥",
    description: "desc",
    matching_guide: "guide",
    status: "verified" as const,
    created_by_agent: null,
    verified_at: null,
    verified_by: null,
    archived_at: null,
    last_mentioned_at: null,
    mention_count: 0,
    created_at: "2026-04-20T00:00:00Z",
    updated_at: "2026-04-20T00:00:00Z",
    negative_examples: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLink.mockResolvedValue({ success: true, count: 0 });
  mockCreate.mockResolvedValue({ success: true, id: "new-theme-id", slug: "new" });
  mockRecalc.mockResolvedValue({ success: true });
  mockClear.mockResolvedValue({ success: true });
  mockLinkExtractions.mockResolvedValue({ success: true, count: 0 });
  mockClearExtractions.mockResolvedValue({ success: true });
});

describe("runTagThemesStep — happy path", () => {
  it("persisteert matches + extraction_themes en recalc stats", async () => {
    mockGetExtractions.mockResolvedValue([
      { id: EXTRACTION_A, type: "need", content: "Twee junior devs werven" },
      { id: EXTRACTION_B, type: "insight", content: "Stef voelt zich kapot" },
    ]);
    mockListThemes.mockResolvedValue([theme(THEME_A), theme(THEME_B, "Werkdruk")]);
    mockTag.mockResolvedValue({
      matches: [
        {
          themeId: THEME_A,
          confidence: "high",
          evidenceQuote: "Twee junior devs werven",
          extractionIds: [EXTRACTION_A],
        },
        {
          themeId: THEME_B,
          confidence: "medium",
          evidenceQuote: "Stef voelt zich kapot",
          extractionIds: [EXTRACTION_B],
        },
      ],
      proposals: [],
      meta: { themesConsidered: 2 },
    });
    mockLink.mockResolvedValue({ success: true, count: 2 });
    mockLinkExtractions.mockResolvedValue({ success: true, count: 2 });

    const result = await runTagThemesStep({
      meetingId: MEETING_ID,
      meetingTitle: "Founders sync",
      summary: "summary-text",
    });

    expect(result).toMatchObject({
      success: true,
      matches_saved: 2,
      proposals_saved: 0,
      extraction_matches_saved: 2,
      themes_considered: 2,
      error: null,
    });
    expect(mockLink).toHaveBeenCalledWith(
      MEETING_ID,
      expect.arrayContaining([
        expect.objectContaining({ themeId: THEME_A, confidence: "high" }),
        expect.objectContaining({ themeId: THEME_B, confidence: "medium" }),
      ]),
    );
    expect(mockLinkExtractions).toHaveBeenCalledWith(
      expect.arrayContaining([
        { extractionId: EXTRACTION_A, themeId: THEME_A, confidence: "high" },
        { extractionId: EXTRACTION_B, themeId: THEME_B, confidence: "medium" },
      ]),
    );
    expect(mockRecalc).toHaveBeenCalledWith([THEME_A, THEME_B]);
  });

  it("filtert extractions op TAGGER_EXTRACTION_TYPES vóór de agent (AI-226)", async () => {
    mockGetExtractions.mockResolvedValue([
      { id: EXTRACTION_A, type: "need", content: "valid need" },
      { id: "risk-id", type: "risk", content: "risk extraction — moet uitgefilterd" },
      { id: EXTRACTION_B, type: "insight", content: "valid insight" },
    ]);
    mockListThemes.mockResolvedValue([theme(THEME_A)]);
    mockTag.mockResolvedValue({
      matches: [],
      proposals: [],
      meta: { themesConsidered: 1 },
    });

    await runTagThemesStep({
      meetingId: MEETING_ID,
      meetingTitle: "M",
      summary: "s",
    });

    const taggerCall = mockTag.mock.calls[0][0];
    const extractionIds = taggerCall.meeting.extractions.map((e: { id: string }) => e.id);
    expect(extractionIds).toEqual([EXTRACTION_A, EXTRACTION_B]);
    expect(extractionIds).not.toContain("risk-id");
  });

  it("slaat negative_examples per thema mee in de agent-input", async () => {
    const themeWithNegs = {
      ...theme(THEME_A),
      negative_examples: [
        {
          theme_id: THEME_A,
          meeting_id: "other-meeting",
          evidence_quote: "Vorige keer ging dit over klant-hiring",
          reason: "ander_thema" as const,
          rejected_at: "2026-04-15T00:00:00Z",
        },
      ],
    };
    mockGetExtractions.mockResolvedValue([
      { id: EXTRACTION_A, type: "need", content: "extraction-1" },
      { id: EXTRACTION_B, type: "insight", content: "extraction-2" },
    ]);
    mockListThemes.mockResolvedValue([themeWithNegs]);
    mockTag.mockResolvedValue({
      matches: [],
      proposals: [],
      meta: { themesConsidered: 1 },
    });

    await runTagThemesStep({
      meetingId: MEETING_ID,
      meetingTitle: "M",
      summary: "s",
    });

    const taggerCall = mockTag.mock.calls[0][0];
    expect(taggerCall.negativeExamples).toEqual([
      {
        themeId: THEME_A,
        evidenceQuote: "Vorige keer ging dit over klant-hiring",
        reason: "ander_thema",
      },
    ]);
  });

  it("roept createEmergingTheme aan voor elke proposal", async () => {
    mockGetExtractions.mockResolvedValue([
      { id: EXTRACTION_A, type: "need", content: "a" },
      { id: EXTRACTION_B, type: "insight", content: "b" },
    ]);
    mockListThemes.mockResolvedValue([theme(THEME_A)]);
    mockTag.mockResolvedValue({
      matches: [],
      proposals: [
        {
          name: "Onboarding proces",
          description: "desc",
          emoji: "📋",
          evidenceQuote: "quote",
          reasoning: "reasoning",
        },
      ],
      meta: { themesConsidered: 1 },
    });

    const result = await runTagThemesStep({
      meetingId: MEETING_ID,
      meetingTitle: "M",
      summary: "s",
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Onboarding proces",
        emoji: "📋",
        description: "desc",
      }),
    );
    expect(result.proposals_saved).toBe(1);
  });
});

describe("runTagThemesStep — EDGE-200: geen extractions", () => {
  it("slaat de agent over en retourneert skipped='no_extractions'", async () => {
    mockGetExtractions.mockResolvedValue([]);
    mockListThemes.mockResolvedValue([theme(THEME_A)]);

    const result = await runTagThemesStep({
      meetingId: MEETING_ID,
      meetingTitle: "leeg",
      summary: "",
    });

    expect(result.skipped).toBe("no_extractions");
    expect(mockTag).not.toHaveBeenCalled();
    expect(mockLink).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});

describe("runTagThemesStep — EDGE-201: agent-fail", () => {
  it("vangt Zod/agent-exceptions op, logt + retourneert success=false zonder throw", async () => {
    mockGetExtractions.mockResolvedValue([
      { id: EXTRACTION_A, type: "need", content: "a" },
      { id: EXTRACTION_B, type: "insight", content: "b" },
    ]);
    mockListThemes.mockResolvedValue([theme(THEME_A)]);
    mockTag.mockRejectedValue(new Error("Zod schema validation failed"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await runTagThemesStep({
      meetingId: MEETING_ID,
      meetingTitle: "M",
      summary: "s",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Zod schema validation failed");
    expect(mockLink).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("runTagThemesStep — lege themes-catalog", () => {
  it("skipt met reason='empty_themes_catalog' zonder agent-call", async () => {
    mockGetExtractions.mockResolvedValue([
      { id: EXTRACTION_A, type: "need", content: "a" },
      { id: EXTRACTION_B, type: "insight", content: "b" },
    ]);
    mockListThemes.mockResolvedValue([]);

    const result = await runTagThemesStep({
      meetingId: MEETING_ID,
      meetingTitle: "M",
      summary: "s",
    });

    expect(result.skipped).toBe("empty_themes_catalog");
    expect(mockTag).not.toHaveBeenCalled();
  });
});

describe("runTagThemesStep — replace flag", () => {
  it("verwijdert bestaande meeting_themes vóór nieuwe matches te schrijven", async () => {
    mockGetExtractions.mockResolvedValue([
      { id: EXTRACTION_A, type: "need", content: "a" },
      { id: EXTRACTION_B, type: "insight", content: "b" },
    ]);
    mockListThemes.mockResolvedValue([theme(THEME_A)]);
    mockTag.mockResolvedValue({
      matches: [
        { themeId: THEME_A, confidence: "high", evidenceQuote: "q", extractionIds: [EXTRACTION_A] },
      ],
      proposals: [],
      meta: { themesConsidered: 1 },
    });
    mockLink.mockResolvedValue({ success: true, count: 1 });

    await runTagThemesStep({
      meetingId: MEETING_ID,
      meetingTitle: "M",
      summary: "s",
      replace: true,
    });

    expect(mockClear).toHaveBeenCalledWith(MEETING_ID);
    expect(mockClearExtractions).toHaveBeenCalledWith(MEETING_ID);
  });

  it("roept clearMeetingThemes NIET aan zonder replace flag", async () => {
    mockGetExtractions.mockResolvedValue([
      { id: EXTRACTION_A, type: "need", content: "a" },
      { id: EXTRACTION_B, type: "insight", content: "b" },
    ]);
    mockListThemes.mockResolvedValue([theme(THEME_A)]);
    mockTag.mockResolvedValue({
      matches: [],
      proposals: [],
      meta: { themesConsidered: 1 },
    });

    await runTagThemesStep({
      meetingId: MEETING_ID,
      meetingTitle: "M",
      summary: "s",
    });

    expect(mockClear).not.toHaveBeenCalled();
    expect(mockClearExtractions).not.toHaveBeenCalled();
  });
});

describe("runTagThemesStep — proposals en extraction_themes (AI-224)", () => {
  it("schrijft GEEN extraction_themes voor proposals (alleen voor bestaande-theme matches)", async () => {
    mockGetExtractions.mockResolvedValue([
      { id: EXTRACTION_A, type: "need", content: "a" },
      { id: EXTRACTION_B, type: "insight", content: "b" },
    ]);
    mockListThemes.mockResolvedValue([theme(THEME_A)]);
    mockTag.mockResolvedValue({
      matches: [
        {
          themeId: THEME_A,
          confidence: "high",
          evidenceQuote: "q",
          extractionIds: [EXTRACTION_A],
        },
      ],
      proposals: [
        {
          name: "Onboarding",
          description: "desc",
          emoji: "📋",
          evidenceQuote: "quote",
          reasoning: "reasoning",
        },
      ],
      meta: { themesConsidered: 1 },
    });
    mockLink.mockResolvedValue({ success: true, count: 2 });
    mockLinkExtractions.mockResolvedValue({ success: true, count: 1 });

    await runTagThemesStep({
      meetingId: MEETING_ID,
      meetingTitle: "M",
      summary: "s",
    });

    const linkExtractionsCall = mockLinkExtractions.mock.calls[0][0];
    expect(linkExtractionsCall).toHaveLength(1);
    expect(linkExtractionsCall[0]).toEqual({
      extractionId: EXTRACTION_A,
      themeId: THEME_A,
      confidence: "high",
    });
  });
});

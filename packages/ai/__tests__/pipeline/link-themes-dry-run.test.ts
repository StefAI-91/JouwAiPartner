import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * TH-011 (FUNC-281) — Dry-run pad van runLinkThemesStep. De test moet
 * hard verifiëren dat persist=false NIET naar de DB schrijft, en dat de
 * PreviewResult alle te-schrijven rijen bevat. Mock-grens: mutations +
 * queries + supabase client.
 */

const mockGetExtractions = vi.fn<(meetingId: string) => Promise<unknown[]>>();
const mockListVerifiedThemes = vi.fn<() => Promise<unknown[]>>();
const mockListRejected = vi.fn<(meetingId: string) => Promise<Set<string>>>();
const mockLinkMeeting = vi.fn();
const mockClearMeeting = vi.fn();
const mockRecalcStats = vi.fn();
const mockLinkExtractions = vi.fn();
const mockClearExtractions = vi.fn();
const mockCreateEmerging = vi.fn();

vi.mock("@repo/database/queries/meetings", () => ({
  getMeetingExtractions: (...args: [string]) => mockGetExtractions(...args),
}));
vi.mock("@repo/database/queries/themes", () => ({
  listVerifiedThemes: () => mockListVerifiedThemes(),
}));
vi.mock("@repo/database/queries/themes/review", () => ({
  listRejectedThemePairsForMeeting: (...args: [string]) => mockListRejected(...args),
}));
vi.mock("@repo/database/mutations/meetings/themes", () => ({
  linkMeetingToThemes: (...args: unknown[]) => mockLinkMeeting(...args),
  clearMeetingThemes: (...args: unknown[]) => mockClearMeeting(...args),
  recalculateThemeStats: (...args: unknown[]) => mockRecalcStats(...args),
}));
vi.mock("@repo/database/mutations/extractions/themes", () => ({
  linkExtractionsToThemes: (...args: unknown[]) => mockLinkExtractions(...args),
  clearExtractionThemesForMeeting: (...args: unknown[]) => mockClearExtractions(...args),
}));
vi.mock("@repo/database/mutations/themes", () => ({
  createEmergingTheme: (...args: unknown[]) => mockCreateEmerging(...args),
}));

import { runLinkThemesStep } from "../../src/pipeline/steps/link-themes";
import type { ThemeDetectorOutput } from "../../src/validations/theme-detector";

const MEETING_ID = "22222222-2222-4222-8222-222222222222";
const THEME_A_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const THEME_A = {
  id: THEME_A_ID,
  slug: "mcp-capabilities",
  name: "MCP Capabilities",
  emoji: "🧭",
  description: "desc",
  matching_guide: "mg",
  status: "verified" as const,
  created_by_agent: null,
  verified_at: null,
  verified_by: null,
  archived_at: null,
  last_mentioned_at: null,
  mention_count: 0,
  origin_meeting_id: null,
  created_at: "",
  updated_at: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetExtractions.mockResolvedValue([]);
  mockListVerifiedThemes.mockResolvedValue([THEME_A]);
  mockListRejected.mockResolvedValue(new Set());
  mockLinkMeeting.mockResolvedValue({ success: true, count: 0 });
  mockClearMeeting.mockResolvedValue({ success: true });
  mockRecalcStats.mockResolvedValue({ success: true });
  mockLinkExtractions.mockResolvedValue({ success: true, count: 0 });
  mockClearExtractions.mockResolvedValue({ success: true });
  mockCreateEmerging.mockResolvedValue({ success: true, id: "new-id", slug: "new" });
});

function detectorOutput(overrides: Partial<ThemeDetectorOutput> = {}): ThemeDetectorOutput {
  return {
    identified_themes: [
      {
        themeId: THEME_A_ID,
        confidence: "high",
        relevance_quote: "MCP besproken",
        theme_summary: "Breed besproken.",
        substantialityEvidence: { extractionCount: 3, reason: "3 kernpunten" },
      },
    ],
    proposed_themes: [
      {
        name: "Cost Monitoring",
        description: "Nieuw",
        matching_guide: "wanneer",
        emoji: "💰",
        rationale: "niet bestaand",
        evidence_quote: "kosten bespreking",
      },
    ],
    ...overrides,
  };
}

describe("runLinkThemesStep — dry-run (persist=false)", () => {
  it("schrijft GEEN enkele rij naar DB", async () => {
    const result = await runLinkThemesStep({
      meetingId: MEETING_ID,
      detectorOutput: detectorOutput(),
      persist: false,
    });

    expect(result.success).toBe(true);
    expect(result.preview).toBeDefined();

    // Hard assertion: geen mutations zijn aangeroepen.
    expect(mockLinkMeeting).not.toHaveBeenCalled();
    expect(mockClearMeeting).not.toHaveBeenCalled();
    expect(mockLinkExtractions).not.toHaveBeenCalled();
    expect(mockClearExtractions).not.toHaveBeenCalled();
    expect(mockCreateEmerging).not.toHaveBeenCalled();
    expect(mockRecalcStats).not.toHaveBeenCalled();
  });

  it("retourneert PreviewResult met identified_themes in meetingThemesToWrite", async () => {
    const result = await runLinkThemesStep({
      meetingId: MEETING_ID,
      detectorOutput: detectorOutput(),
      persist: false,
    });

    expect(result.preview?.meetingThemesToWrite).toEqual([
      expect.objectContaining({
        themeId: THEME_A_ID,
        themeName: "MCP Capabilities",
        confidence: "high",
        evidenceQuote: "MCP besproken",
        summary: "Breed besproken.",
        source: "identified",
      }),
    ]);
  });

  it("retourneert proposals in proposalsToCreate (nog niet gemerged)", async () => {
    const result = await runLinkThemesStep({
      meetingId: MEETING_ID,
      detectorOutput: detectorOutput(),
      persist: false,
    });

    expect(result.preview?.proposalsToCreate).toEqual([
      expect.objectContaining({
        name: "Cost Monitoring",
        mergesIntoThemeId: null,
      }),
    ]);
  });

  it("merge-detectie (EDGE-232): proposal-naam matcht bestaande theme case-insensitive", async () => {
    const result = await runLinkThemesStep({
      meetingId: MEETING_ID,
      detectorOutput: detectorOutput({
        proposed_themes: [
          {
            name: "mcp capabilities",
            description: "dup",
            matching_guide: "x",
            emoji: "🧭",
            rationale: "merge test",
            evidence_quote: "q",
          },
        ],
      }),
      persist: false,
    });

    expect(result.preview?.proposalsToCreate[0].mergesIntoThemeId).toBe(THEME_A_ID);
  });

  it("rejection-filter (FUNC-274): gerejecteerd paar landt in skippedDueToRejection", async () => {
    mockListRejected.mockResolvedValue(new Set([THEME_A_ID]));
    const result = await runLinkThemesStep({
      meetingId: MEETING_ID,
      detectorOutput: detectorOutput(),
      persist: false,
    });

    expect(result.preview?.skippedDueToRejection).toEqual([
      expect.objectContaining({ themeId: THEME_A_ID }),
    ]);
    expect(result.preview?.meetingThemesToWrite).toEqual([]);
  });
});

describe("runLinkThemesStep — persist=true (sanity)", () => {
  it("roept linkMeetingToThemes aan met mapped rijen", async () => {
    await runLinkThemesStep({
      meetingId: MEETING_ID,
      detectorOutput: detectorOutput({ proposed_themes: [] }),
      persist: true,
    });

    expect(mockLinkMeeting).toHaveBeenCalled();
    const [meetingIdArg, matchesArg] = mockLinkMeeting.mock.calls[0];
    expect(meetingIdArg).toBe(MEETING_ID);
    expect(matchesArg).toEqual([
      expect.objectContaining({
        themeId: THEME_A_ID,
        confidence: "high",
        evidenceQuote: "MCP besproken",
        summary: "Breed besproken.",
      }),
    ]);
  });

  it("clear-cascade bij replace=true: meeting_themes en extraction_themes eerst geleegd", async () => {
    await runLinkThemesStep({
      meetingId: MEETING_ID,
      detectorOutput: detectorOutput({ proposed_themes: [] }),
      persist: true,
      replace: true,
    });

    expect(mockClearMeeting).toHaveBeenCalledWith(MEETING_ID);
    expect(mockClearExtractions).toHaveBeenCalledWith(MEETING_ID);
  });

  it("proposal met origin_meeting_id door naar createEmergingTheme", async () => {
    await runLinkThemesStep({
      meetingId: MEETING_ID,
      detectorOutput: detectorOutput(),
      persist: true,
    });

    expect(mockCreateEmerging).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Cost Monitoring",
        origin_meeting_id: MEETING_ID,
      }),
    );
  });
});

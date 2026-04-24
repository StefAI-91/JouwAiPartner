import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * TH-013 (FUNC-291) — Fallback-keten voor `meeting_themes.summary`:
 *   1. Summarizer's `summarizerThemeSummaries` Map (primair sinds TH-013)
 *   2. Theme-Detector's `theme_summary` (fallback 1-2 zinnen)
 *   3. null (laatste redmiddel)
 *
 * We asserteren op de preview-output (persist=false) zodat we geen echte
 * DB-writes nodig hebben — de `meetingThemesToWrite[i].summary` toont welke
 * bron er gewonnen heeft per thema. Mock-grens identiek aan
 * `link-themes-dry-run.test.ts`.
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
vi.mock("@repo/database/mutations/meeting-themes", () => ({
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
const THEME_B_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const baseTheme = {
  slug: "x",
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
const THEME_A = { ...baseTheme, id: THEME_A_ID, name: "Coaching" };
const THEME_B = { ...baseTheme, id: THEME_B_ID, name: "Architecture" };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetExtractions.mockResolvedValue([]);
  mockListVerifiedThemes.mockResolvedValue([THEME_A, THEME_B]);
  mockListRejected.mockResolvedValue(new Set());
  mockLinkMeeting.mockResolvedValue({ success: true, count: 0 });
  mockClearMeeting.mockResolvedValue({ success: true });
  mockRecalcStats.mockResolvedValue({ success: true });
  mockLinkExtractions.mockResolvedValue({ success: true, count: 0 });
  mockClearExtractions.mockResolvedValue({ success: true });
});

function detectorOutputTwoThemes(): ThemeDetectorOutput {
  return {
    identified_themes: [
      {
        themeId: THEME_A_ID,
        confidence: "high",
        relevance_quote: "quote A",
        theme_summary: "Detector summary voor A (1-2 zinnen).",
        substantialityEvidence: { extractionCount: 3, reason: "genoeg" },
      },
      {
        themeId: THEME_B_ID,
        confidence: "medium",
        relevance_quote: "quote B",
        theme_summary: "Detector summary voor B.",
        substantialityEvidence: { extractionCount: 2, reason: "genoeg" },
      },
    ],
    proposed_themes: [],
  };
}

describe("link-themes fallback-keten — meeting_themes.summary", () => {
  it("Summarizer-map wint boven Detector-summary bij happy path", async () => {
    const summarizerMap = new Map<string, string>([
      [THEME_A_ID, "## Briefing\nRijke Summarizer-versie A.\n\n## Kernpunten\n- Punt."],
      [THEME_B_ID, "## Briefing\nRijke Summarizer-versie B."],
    ]);

    const result = await runLinkThemesStep({
      meetingId: MEETING_ID,
      detectorOutput: detectorOutputTwoThemes(),
      summarizerThemeSummaries: summarizerMap,
      persist: false,
    });

    expect(result.preview).toBeDefined();
    const entries = result.preview!.meetingThemesToWrite;
    expect(entries).toHaveLength(2);

    const byId = new Map(entries.map((e) => [e.themeId, e.summary]));
    expect(byId.get(THEME_A_ID)).toContain("## Briefing");
    expect(byId.get(THEME_A_ID)).toContain("Rijke Summarizer-versie A");
    expect(byId.get(THEME_B_ID)).toContain("Rijke Summarizer-versie B");
    // Detector-output mag niet meer zichtbaar zijn wanneer Summarizer aanwezig is
    expect(byId.get(THEME_A_ID)).not.toContain("Detector summary voor A");
  });

  it("valt per thema terug op Detector-summary wanneer Summarizer-map die themeId niet heeft (EDGE-241)", async () => {
    // Summarizer leverde alleen A, niet B
    const partialMap = new Map<string, string>([[THEME_A_ID, "## Briefing\nRijke versie A."]]);

    const result = await runLinkThemesStep({
      meetingId: MEETING_ID,
      detectorOutput: detectorOutputTwoThemes(),
      summarizerThemeSummaries: partialMap,
      persist: false,
    });

    const byId = new Map(result.preview!.meetingThemesToWrite.map((e) => [e.themeId, e.summary]));
    expect(byId.get(THEME_A_ID)).toContain("Rijke versie A");
    // B valt terug op Detector
    expect(byId.get(THEME_B_ID)).toBe("Detector summary voor B.");
  });

  it("valt volledig terug op Detector-summaries wanneer Summarizer-map leeg is", async () => {
    const result = await runLinkThemesStep({
      meetingId: MEETING_ID,
      detectorOutput: detectorOutputTwoThemes(),
      summarizerThemeSummaries: new Map(),
      persist: false,
    });

    const byId = new Map(result.preview!.meetingThemesToWrite.map((e) => [e.themeId, e.summary]));
    expect(byId.get(THEME_A_ID)).toBe("Detector summary voor A (1-2 zinnen).");
    expect(byId.get(THEME_B_ID)).toBe("Detector summary voor B.");
  });

  it("valt volledig terug op Detector-summaries wanneer summarizerThemeSummaries ontbreekt (pre-TH-013 caller)", async () => {
    const result = await runLinkThemesStep({
      meetingId: MEETING_ID,
      detectorOutput: detectorOutputTwoThemes(),
      persist: false,
    });

    const byId = new Map(result.preview!.meetingThemesToWrite.map((e) => [e.themeId, e.summary]));
    expect(byId.get(THEME_A_ID)).toBe("Detector summary voor A (1-2 zinnen).");
    expect(byId.get(THEME_B_ID)).toBe("Detector summary voor B.");
  });
});

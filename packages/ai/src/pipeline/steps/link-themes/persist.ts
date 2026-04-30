import {
  linkMeetingToThemes,
  clearMeetingThemes,
  recalculateThemeStats,
} from "@repo/database/mutations/meetings/themes";
import {
  linkExtractionsToThemes,
  clearExtractionThemesForMeeting,
  type ExtractionThemeRow,
} from "@repo/database/mutations/extractions/themes";
import { createEmergingTheme } from "@repo/database/mutations/themes";
import { runThemeNarrativeSynthesis } from "../synthesize-theme-narrative";
import type {
  LinkThemesResult,
  MeetingThemeToWrite,
  ProposalToCreate,
  SkippedDueToRejection,
} from "./types";

export interface PersistInput {
  meetingId: string;
  replace: boolean;
  themesConsidered: number;
  proposalsToCreate: ProposalToCreate[];
  meetingThemesToWrite: MeetingThemeToWrite[];
  extractionThemesToWrite: ExtractionThemeRow[];
  skippedDueToRejection: SkippedDueToRejection[];
  rejectedThemeIds: Set<string>;
}

/**
 * Step 5 — Persist-flow: clear → proposals → meeting_themes → extraction_themes
 * → stats → theme-narrator. Returnt een vroege error-response als clear of
 * link-meeting faalt. Extraction-link, stats en narrator zijn fire-and-forget.
 */
export async function persistResults(input: PersistInput): Promise<LinkThemesResult> {
  if (input.replace) {
    const clearError = await clearMeetingData(input.meetingId);
    if (clearError) {
      return errorResult(clearError, input.themesConsidered);
    }
  }

  const proposalsSaved = await persistProposals(input);

  const linkRes = await linkMeetingToThemes(
    input.meetingId,
    input.meetingThemesToWrite.map((m) => ({
      themeId: m.themeId,
      confidence: m.confidence,
      evidenceQuote: m.evidenceQuote,
      summary: m.summary,
    })),
  );
  if ("error" in linkRes) {
    return {
      success: false,
      matches_saved: 0,
      proposals_saved: proposalsSaved,
      extraction_matches_saved: 0,
      themes_considered: input.themesConsidered,
      error: `link: ${linkRes.error}`,
    };
  }

  const extractionLinkRes = await linkExtractionsToThemes(input.extractionThemesToWrite);
  if ("error" in extractionLinkRes) {
    console.warn(`[link-themes] linkExtractionsToThemes failed: ${extractionLinkRes.error}`);
  }

  const affected = Array.from(new Set(input.meetingThemesToWrite.map((m) => m.themeId)));
  await recalcAndNarrate(affected);

  return {
    success: true,
    matches_saved: linkRes.count,
    proposals_saved: proposalsSaved,
    extraction_matches_saved: "count" in extractionLinkRes ? extractionLinkRes.count : 0,
    themes_considered: input.themesConsidered,
    error: null,
  };
}

async function clearMeetingData(meetingId: string): Promise<string | null> {
  const clearRes = await clearMeetingThemes(meetingId);
  if ("error" in clearRes) return `clear: ${clearRes.error}`;
  const clearExtRes = await clearExtractionThemesForMeeting(meetingId);
  if ("error" in clearExtRes) return `clear_extractions: ${clearExtRes.error}`;
  return null;
}

/**
 * Persist-fase 5a — proposals omzetten in meeting_themes-additions:
 * - merge-candidates (EDGE-232) krijgen geen create, alleen een meeting_themes
 *   rij voor de bestaande theme (mits niet gerejected).
 * - verse proposals krijgen een nieuwe theme-row via createEmergingTheme en
 *   worden daarna ook als meeting_themes-rij toegevoegd.
 *
 * Mutates `input.meetingThemesToWrite` en `input.skippedDueToRejection`
 * (matcht origineel gedrag — orchestrator gebruikt deze arrays direct).
 */
async function persistProposals(input: PersistInput): Promise<number> {
  let proposalsSaved = 0;
  for (const p of input.proposalsToCreate) {
    if (p.mergesIntoThemeId) {
      if (input.rejectedThemeIds.has(p.mergesIntoThemeId)) {
        input.skippedDueToRejection.push({
          themeId: p.mergesIntoThemeId,
          themeName: p.name,
          reason: "theme_match_rejections",
        });
        continue;
      }
      // Voeg toe aan meetingThemesToWrite zodat de insert-batch 'm mee neemt.
      // Duplicates op themeId worden door upsert gededupliceerd.
      input.meetingThemesToWrite.push({
        themeId: p.mergesIntoThemeId,
        themeName: p.name,
        confidence: "medium",
        evidenceQuote: p.evidence_quote,
        summary: null,
        source: "emerging",
      });
      continue;
    }

    const createRes = await createEmergingTheme({
      name: p.name,
      description: p.description,
      matching_guide: p.matching_guide,
      emoji: p.emoji,
      origin_meeting_id: input.meetingId,
    });
    if ("error" in createRes) {
      console.warn(`[link-themes] createEmergingTheme failed: ${createRes.error}`);
      continue;
    }
    proposalsSaved += 1;
    input.meetingThemesToWrite.push({
      themeId: createRes.id,
      themeName: p.name,
      confidence: "medium",
      evidenceQuote: p.evidence_quote,
      summary: null,
      source: "emerging",
    });
  }
  return proposalsSaved;
}

/**
 * Recalc stats voor alle aangeraakte themes + TH-014 (FUNC-304) Theme-Narrator
 * trigger. Beide fire-and-forget — errors mogen link-themes niet breken.
 */
async function recalcAndNarrate(affected: string[]): Promise<void> {
  if (affected.length === 0) return;

  const statsRes = await recalculateThemeStats(affected);
  if ("error" in statsRes) {
    console.warn(`[link-themes] recalculateThemeStats failed: ${statsRes.error}`);
  }

  const narrativeResults = await Promise.allSettled(
    affected.map((themeId) => runThemeNarrativeSynthesis(themeId)),
  );
  for (const [i, res] of narrativeResults.entries()) {
    if (res.status === "rejected") {
      console.warn(
        `[link-themes] theme-narrator synthesis rejected for theme ${affected[i]}: ${String(res.reason)}`,
      );
    } else if (!res.value.success) {
      console.warn(
        `[link-themes] theme-narrator synthesis failed for theme ${affected[i]}: ${res.value.error ?? "unknown"}`,
      );
    }
  }
}

function errorResult(error: string, themesConsidered: number): LinkThemesResult {
  return {
    success: false,
    matches_saved: 0,
    proposals_saved: 0,
    extraction_matches_saved: 0,
    themes_considered: themesConsidered,
    error,
  };
}

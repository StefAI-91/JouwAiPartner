import { tagMeetingThemes, type TagMeetingThemesInput } from "../../agents/theme-tagger";
import { TAGGER_EXTRACTION_TYPES } from "../../validations/theme-tagger";
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
  type ExtractionThemeRow,
} from "@repo/database/mutations/extraction-themes";
import { createEmergingTheme } from "@repo/database/mutations/themes";

const TAGGER_TYPES: ReadonlySet<string> = new Set(TAGGER_EXTRACTION_TYPES);

export interface TagThemesResult {
  success: boolean;
  matches_saved: number;
  proposals_saved: number;
  extraction_matches_saved: number;
  themes_considered: number;
  error: string | null;
  /** True als step werd overgeslagen (geen extractions, lege themes catalog). */
  skipped?: string;
}

export interface TagThemesStepInput {
  meetingId: string;
  meetingTitle: string;
  /** Rich summary uit de summarize-stap, of raw summary als fallback. */
  summary: string;
  /**
   * Bij `replace = true` (TH-006 regenerate + batch --force) worden bestaande
   * meeting_themes eerst verwijderd. Default false: upsert op composite PK
   * volstaat voor normale pipeline-runs.
   */
  replace?: boolean;
}

/**
 * Pipeline-step: ThemeTagger over één meeting, met EDGE-case-guards en
 * idempotency. Never throws — de ThemeTagger is niet-kritiek; een falende
 * tagging mag nooit de rest van de pipeline of de save van een meeting
 * breken.
 *
 * Flow:
 *   1. Fetch extractions + themes (met negative_examples) parallel.
 *   2. EDGE-200: 0 extractions → skip agent.
 *   3. Call tagMeetingThemes.
 *   4. EDGE-201: agent/Zod-fail → log + return zonder crash.
 *   5. `replace` → eerst meeting_themes voor deze meeting leegmaken.
 *   6. Persist proposals (createEmergingTheme) → matches → recalc stats.
 */
export async function runTagThemesStep(input: TagThemesStepInput): Promise<TagThemesResult> {
  try {
    const [allExtractionRows, themes] = await Promise.all([
      getMeetingExtractions(input.meetingId),
      listVerifiedThemes({ includeNegativeExamples: true }),
    ]);

    // AI-226: filter op starter-set types vóór Tagger-input. Progressief
    // toevoegen = één regel in `TAGGER_EXTRACTION_TYPES` wijzigen.
    const extractionRows = allExtractionRows.filter((e) => TAGGER_TYPES.has(e.type));

    if (extractionRows.length === 0) {
      return {
        success: true,
        matches_saved: 0,
        proposals_saved: 0,
        extraction_matches_saved: 0,
        themes_considered: themes.length,
        error: null,
        skipped: "no_extractions",
      };
    }

    if (themes.length === 0) {
      return {
        success: true,
        matches_saved: 0,
        proposals_saved: 0,
        extraction_matches_saved: 0,
        themes_considered: 0,
        error: null,
        skipped: "empty_themes_catalog",
      };
    }

    const taggerInput: TagMeetingThemesInput = {
      meeting: {
        meetingId: input.meetingId,
        title: input.meetingTitle,
        summary: input.summary,
        extractions: extractionRows.map((e) => ({
          id: e.id,
          type: e.type,
          content: e.content,
        })),
      },
      themes: themes.map((t) => ({
        themeId: t.id,
        name: t.name,
        description: t.description,
        matching_guide: t.matching_guide,
      })),
      negativeExamples: themes.flatMap((t) =>
        t.negative_examples.map((n) => ({
          themeId: t.id,
          evidenceQuote: n.evidence_quote,
          reason: n.reason,
        })),
      ),
    };

    const output = await tagMeetingThemes(taggerInput);

    if (input.replace) {
      const clearRes = await clearMeetingThemes(input.meetingId);
      if ("error" in clearRes) {
        return {
          success: false,
          matches_saved: 0,
          proposals_saved: 0,
          extraction_matches_saved: 0,
          themes_considered: themes.length,
          error: `clear: ${clearRes.error}`,
        };
      }
      // TH-010: cascade ook de extraction-junction zodat oude links niet
      // blijven hangen na regenerate / batch --force.
      const clearExtractionsRes = await clearExtractionThemesForMeeting(input.meetingId);
      if ("error" in clearExtractionsRes) {
        return {
          success: false,
          matches_saved: 0,
          proposals_saved: 0,
          extraction_matches_saved: 0,
          themes_considered: themes.length,
          error: `clear_extractions: ${clearExtractionsRes.error}`,
        };
      }
    }

    // Proposals worden eerst verwerkt zodat — als ThemeTagger in dezelfde call
    // ook naar een fresh emerging theme had willen linken (niet v1-flow, maar
    // defensief) — de theme_id bestaat. In v1 linkt de agent alleen naar
    // bestaande themes.
    const proposalMatches: Array<{
      themeId: string;
      confidence: "medium" | "high";
      evidenceQuote: string;
    }> = [];
    let proposalsSaved = 0;
    for (const proposal of output.proposals) {
      const createRes = await createEmergingTheme({
        name: proposal.name,
        description: proposal.description,
        matching_guide: `${proposal.reasoning}\n\nEvidence: "${proposal.evidenceQuote}"`,
        emoji: proposal.emoji,
      });
      if ("error" in createRes) {
        console.warn(`[tag-themes] createEmergingTheme failed: ${createRes.error}`);
        continue;
      }
      proposalsSaved += 1;
      // Link de origin meeting aan het nieuwe emerging theme zodat (a) de
      // review-card in TH-006 "gevonden in:" kan tonen zonder extra kolom,
      // en (b) mention_count vanaf het eerste moment klopt. Confidence is
      // medium — we hebben geen high-confidence signal voor een net-
      // voorgesteld thema.
      proposalMatches.push({
        themeId: createRes.id,
        confidence: "medium",
        evidenceQuote: proposal.evidenceQuote,
      });
    }

    const allMatches = [
      ...output.matches.map((m) => ({
        themeId: m.themeId,
        confidence: m.confidence,
        evidenceQuote: m.evidenceQuote,
      })),
      ...proposalMatches,
    ];
    const linkRes = await linkMeetingToThemes(input.meetingId, allMatches);
    if ("error" in linkRes) {
      return {
        success: false,
        matches_saved: 0,
        proposals_saved: proposalsSaved,
        extraction_matches_saved: 0,
        themes_considered: themes.length,
        error: `link: ${linkRes.error}`,
      };
    }

    // TH-010: schrijf extraction-level links alleen voor matches tegen
    // bestaande themes — proposals (AI-224) krijgen geen extractionIds mee.
    const extractionLinkRows: ExtractionThemeRow[] = output.matches.flatMap((m) =>
      m.extractionIds.map((extractionId) => ({
        extractionId,
        themeId: m.themeId,
        confidence: m.confidence,
      })),
    );
    const extractionLinkRes = await linkExtractionsToThemes(extractionLinkRows);
    if ("error" in extractionLinkRes) {
      // Non-blocking: de meeting_themes-rijen staan al, we loggen en gaan door
      // zodat dashboard-pills en donut correct blijven (TH-004 verwachting).
      console.warn(`[tag-themes] linkExtractionsToThemes failed: ${extractionLinkRes.error}`);
    }

    const affectedThemeIds = allMatches.map((m) => m.themeId);
    if (affectedThemeIds.length > 0) {
      const statsRes = await recalculateThemeStats(affectedThemeIds);
      if ("error" in statsRes) {
        console.warn(`[tag-themes] recalculateThemeStats failed: ${statsRes.error}`);
      }
    }

    return {
      success: true,
      matches_saved: linkRes.count,
      proposals_saved: proposalsSaved,
      extraction_matches_saved: "count" in extractionLinkRes ? extractionLinkRes.count : 0,
      themes_considered: themes.length,
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[tag-themes] non-blocking failure:", msg);
    return {
      success: false,
      matches_saved: 0,
      proposals_saved: 0,
      extraction_matches_saved: 0,
      themes_considered: 0,
      error: msg,
    };
  }
}

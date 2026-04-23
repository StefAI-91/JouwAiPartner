import { getMeetingExtractions } from "@repo/database/queries/meetings";
import { listVerifiedThemes, type ThemeRow } from "@repo/database/queries/themes";
import { listRejectedThemePairsForMeeting } from "@repo/database/queries/theme-review";
import {
  linkMeetingToThemes,
  clearMeetingThemes,
  recalculateThemeStats,
} from "@repo/database/mutations/meeting-themes";
import {
  linkExtractionsToThemes,
  clearExtractionThemesForMeeting,
  type ExtractionThemeRow,
} from "@repo/database/mutations/extraction-themes";
import { createEmergingTheme } from "@repo/database/mutations/themes";
import type { ThemeDetectorOutput } from "../../validations/theme-detector";
import { parseThemesAnnotation, resolveThemeRefs, type ThemeRef } from "../tagger";

/**
 * TH-011 (FUNC-270..276, FUNC-281) — Pipeline-step die de Theme-Detector
 * output + Summarizer-annotaties omzet naar meeting_themes +
 * extraction_themes rijen, en proposals als emerging themes registreert.
 *
 * Vervangt `runTagThemesStep` in de pipeline-volgorde. Draait NA alle
 * extractors zodat extraction.content + Summarizer kernpunten al
 * beschikbaar zijn voor annotation-parsing.
 *
 * Dry-run (persist=false) voert alle berekeningen uit maar schrijft niets.
 * Retourneert in plaats daarvan een `PreviewResult` met álle to-be-written
 * rijen — voedt de `/dev/detector` full-pipeline harness (FUNC-282).
 */

export interface LinkThemesStepInput {
  meetingId: string;
  detectorOutput: ThemeDetectorOutput;
  /** Kernpunten van de Summarizer — parser zoekt hierin naar `[Themes:]` markers voor context, maar extraction-level links komen uit extraction.content. */
  kernpunten?: string[];
  /** Vervolgstappen van de Summarizer — idem als kernpunten. */
  vervolgstappen?: string[];
  /**
   * Bij `replace = true` worden bestaande meeting_themes en extraction_themes
   * voor deze meeting eerst verwijderd. Gebruikt door de regenerate-knop
   * (FUNC-283) en de batch --force flow (FUNC-278).
   */
  replace?: boolean;
  /**
   * Default `true`. Bij `false` schrijft de step NIETS naar de DB en
   * retourneert `PreviewResult` met alle te-schrijven rijen. Voor de
   * dev-detector harness dry-run mode (FUNC-281).
   */
  persist?: boolean;
}

export interface MeetingThemeToWrite {
  themeId: string;
  themeName: string;
  confidence: "medium" | "high";
  evidenceQuote: string;
  summary: string | null;
  /** 'identified' = match tegen bestaande verified theme; 'emerging' = via proposal. */
  source: "identified" | "emerging";
}

export interface ProposalToCreate {
  name: string;
  description: string;
  matching_guide: string;
  emoji: string;
  evidence_quote: string;
  /** Null wanneer het proposal case-insensitive matcht met een bestaande theme (EDGE-232) — dan wordt er GEEN nieuwe theme gemaakt. */
  mergesIntoThemeId: string | null;
}

export interface SkippedDueToRejection {
  themeId: string;
  themeName: string;
  reason: "theme_match_rejections";
}

export interface PreviewResult {
  meetingThemesToWrite: MeetingThemeToWrite[];
  extractionThemesToWrite: ExtractionThemeRow[];
  proposalsToCreate: ProposalToCreate[];
  skippedDueToRejection: SkippedDueToRejection[];
  /** Aantal verified themes dat de resolver vanuit de DB heeft overwogen. */
  themesConsidered: number;
}

export interface LinkThemesResult {
  success: boolean;
  matches_saved: number;
  proposals_saved: number;
  extraction_matches_saved: number;
  themes_considered: number;
  error: string | null;
  skipped?: string;
  /** Alleen gevuld wanneer persist=false. */
  preview?: PreviewResult;
}

/**
 * Never-throws. Een crash in link-themes mag de rest van de pipeline niet
 * breken (analoog aan `runTagThemesStep` — theme-linking is niet-kritiek).
 */
export async function runLinkThemesStep(input: LinkThemesStepInput): Promise<LinkThemesResult> {
  const persist = input.persist ?? true;

  try {
    const [verifiedThemes, extractionRows, rejectedThemeIds] = await Promise.all([
      listVerifiedThemes(),
      getMeetingExtractions(input.meetingId),
      listRejectedThemePairsForMeeting(input.meetingId),
    ]);

    // Lege catalogus + geen detector-output → niks te doen. Consistent met
    // de oude `empty_themes_catalog` skip.
    if (
      verifiedThemes.length === 0 &&
      input.detectorOutput.identified_themes.length === 0 &&
      input.detectorOutput.proposed_themes.length === 0
    ) {
      return emptyResult(persist, 0, "empty_input");
    }

    const verifiedThemesByNormalized = new Map<string, ThemeRow>();
    for (const t of verifiedThemes) {
      verifiedThemesByNormalized.set(normalizeName(t.name), t);
    }

    // 1. Proposals resolven — EDGE-232: proposal-naam matcht bestaande verified
    //    theme (case-insensitive) → geen nieuwe theme, merge naar bestaand.
    const proposalsToCreate: ProposalToCreate[] = [];
    for (const p of input.detectorOutput.proposed_themes) {
      const existing = verifiedThemesByNormalized.get(normalizeName(p.name));
      proposalsToCreate.push({
        name: p.name,
        description: p.description,
        matching_guide: p.matching_guide,
        emoji: p.emoji,
        evidence_quote: p.evidence_quote,
        mergesIntoThemeId: existing?.id ?? null,
      });
    }

    // 2. Bepaal welke meeting_themes rijen er moeten komen. Identified first,
    //    dan (in een tweede pass) de proposals die NIET mergen. Filter tegen
    //    rejected pairs voor DB-persist — bij dry-run rapporteren we ze in
    //    skippedDueToRejection zodat de admin ze ziet.
    const skippedDueToRejection: SkippedDueToRejection[] = [];
    const meetingThemesToWrite: MeetingThemeToWrite[] = [];

    for (const t of input.detectorOutput.identified_themes) {
      const catalogEntry = verifiedThemes.find((v) => v.id === t.themeId);
      if (!catalogEntry) {
        // EDGE-231: theme is archived/verdwenen tussen detect-tijd en link-
        // tijd. Skip zonder crash.
        console.warn(
          `[link-themes] identified_theme ${t.themeId} niet meer in verified catalogus — meeting=${input.meetingId}`,
        );
        continue;
      }
      if (rejectedThemeIds.has(t.themeId)) {
        skippedDueToRejection.push({
          themeId: t.themeId,
          themeName: catalogEntry.name,
          reason: "theme_match_rejections",
        });
        continue;
      }
      meetingThemesToWrite.push({
        themeId: t.themeId,
        themeName: catalogEntry.name,
        confidence: t.confidence,
        evidenceQuote: t.relevance_quote,
        summary: t.theme_summary,
        source: "identified",
      });
    }

    // 3. Per-extraction annotation-parsing voor extraction_themes. Identified
    //    themes + knownThemes als resolve-context. Proposals tellen pas mee na
    //    create (persist-flow), dus in dry-run zie je ze apart in
    //    proposalsToCreate.
    const identifiedRefs: ThemeRef[] = input.detectorOutput.identified_themes.map((t) => {
      const c = verifiedThemes.find((v) => v.id === t.themeId);
      return { themeId: t.themeId, name: c?.name ?? t.themeId };
    });
    const knownRefs: ThemeRef[] = verifiedThemes.map((t) => ({ themeId: t.id, name: t.name }));

    const extractionThemesToWrite: ExtractionThemeRow[] = [];
    for (const ex of extractionRows) {
      const names = parseThemesAnnotation(ex.content);
      const fallbackNames = names.length === 0 ? substringFallbackNames(ex.content, knownRefs) : [];
      const refs = resolveThemeRefs([...names, ...fallbackNames], identifiedRefs, knownRefs);
      const identifiedThemeForConfidence = new Map<string, "medium" | "high">();
      for (const t of input.detectorOutput.identified_themes) {
        identifiedThemeForConfidence.set(t.themeId, t.confidence);
      }
      for (const ref of refs) {
        // Skip als het paar gerejected is — extraction_themes volgen
        // dezelfde rejection-policy als meeting_themes.
        if (rejectedThemeIds.has(ref.themeId)) continue;
        extractionThemesToWrite.push({
          extractionId: ex.id,
          themeId: ref.themeId,
          confidence: identifiedThemeForConfidence.get(ref.themeId) ?? "medium",
        });
      }
    }

    const themesConsidered = verifiedThemes.length;

    // 4. Dry-run: return preview, geen DB-writes.
    if (!persist) {
      return {
        success: true,
        matches_saved: 0,
        proposals_saved: 0,
        extraction_matches_saved: 0,
        themes_considered: themesConsidered,
        error: null,
        preview: {
          meetingThemesToWrite,
          extractionThemesToWrite,
          proposalsToCreate,
          skippedDueToRejection,
          themesConsidered,
        },
      };
    }

    // 5. Persist-flow — clear → proposals → meeting_themes → extraction_themes → stats.
    if (input.replace) {
      const clearRes = await clearMeetingThemes(input.meetingId);
      if ("error" in clearRes) {
        return {
          success: false,
          matches_saved: 0,
          proposals_saved: 0,
          extraction_matches_saved: 0,
          themes_considered: themesConsidered,
          error: `clear: ${clearRes.error}`,
        };
      }
      const clearExtRes = await clearExtractionThemesForMeeting(input.meetingId);
      if ("error" in clearExtRes) {
        return {
          success: false,
          matches_saved: 0,
          proposals_saved: 0,
          extraction_matches_saved: 0,
          themes_considered: themesConsidered,
          error: `clear_extractions: ${clearExtRes.error}`,
        };
      }
    }

    // 5a. Proposals persisten. Merge-candidates (EDGE-232) krijgen geen
    //     create — ze voegen alleen een meeting_themes rij toe voor de
    //     bestaande theme. Verse proposals krijgen een nieuwe theme-row
    //     met status='emerging' en origin_meeting_id.
    let proposalsSaved = 0;
    for (const p of proposalsToCreate) {
      if (p.mergesIntoThemeId) {
        // Merge: behandel als identified_theme-link (confidence medium) als
        // het paar niet gerejected is.
        if (rejectedThemeIds.has(p.mergesIntoThemeId)) {
          skippedDueToRejection.push({
            themeId: p.mergesIntoThemeId,
            themeName: p.name,
            reason: "theme_match_rejections",
          });
          continue;
        }
        // Voeg toe aan meetingThemesToWrite zodat de insert-batch 'm mee
        // neemt. Duplicates op themeId worden door upsert gededupliceerd.
        meetingThemesToWrite.push({
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
      meetingThemesToWrite.push({
        themeId: createRes.id,
        themeName: p.name,
        confidence: "medium",
        evidenceQuote: p.evidence_quote,
        summary: null,
        source: "emerging",
      });
    }

    // 5b. meeting_themes batch insert.
    const linkRes = await linkMeetingToThemes(
      input.meetingId,
      meetingThemesToWrite.map((m) => ({
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
        themes_considered: themesConsidered,
        error: `link: ${linkRes.error}`,
      };
    }

    // 5c. extraction_themes batch insert.
    const extractionLinkRes = await linkExtractionsToThemes(extractionThemesToWrite);
    if ("error" in extractionLinkRes) {
      console.warn(`[link-themes] linkExtractionsToThemes failed: ${extractionLinkRes.error}`);
    }

    // 5d. Recalc stats voor alle aangeraakte themes.
    const affected = Array.from(new Set(meetingThemesToWrite.map((m) => m.themeId)));
    if (affected.length > 0) {
      const statsRes = await recalculateThemeStats(affected);
      if ("error" in statsRes) {
        console.warn(`[link-themes] recalculateThemeStats failed: ${statsRes.error}`);
      }
    }

    return {
      success: true,
      matches_saved: linkRes.count,
      proposals_saved: proposalsSaved,
      extraction_matches_saved: "count" in extractionLinkRes ? extractionLinkRes.count : 0,
      themes_considered: themesConsidered,
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[link-themes] non-blocking failure:", msg);
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

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function emptyResult(
  persist: boolean,
  themesConsidered: number,
  skipped: string,
): LinkThemesResult {
  const base = {
    success: true as const,
    matches_saved: 0,
    proposals_saved: 0,
    extraction_matches_saved: 0,
    themes_considered: themesConsidered,
    error: null,
    skipped,
  };
  if (!persist) {
    return {
      ...base,
      preview: {
        meetingThemesToWrite: [],
        extractionThemesToWrite: [],
        proposalsToCreate: [],
        skippedDueToRejection: [],
        themesConsidered,
      },
    };
  }
  return base;
}

/**
 * FUNC-271 (3) — fallback wanneer extraction geen `[Themes:]` annotatie
 * heeft. Zoek substrings van theme-namen (≥3 chars) in content. Bij 2+
 * matches → ambiguous → geen fallback (caller kiest geen). Dit is een
 * goedkope, deterministische safety net; ML/embedding-based matching
 * blijft out of scope (zie TH-011 sprint §Out of scope).
 */
function substringFallbackNames(content: string, knownRefs: ThemeRef[]): string[] {
  const normalizedContent = normalizeName(content);
  const hits = knownRefs.filter((t) => {
    const n = normalizeName(t.name);
    return n.length >= 3 && normalizedContent.includes(n);
  });
  if (hits.length !== 1) return [];
  return [hits[0].name];
}

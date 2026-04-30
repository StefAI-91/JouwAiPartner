import type { ThemeRow } from "@repo/database/queries/themes";
import type { ExtractionThemeRow } from "@repo/database/mutations/extractions/themes";
import type { ThemeDetectorOutput } from "../../../validations/theme-detector";
import { parseThemesAnnotation, resolveThemeRefs, type ThemeRef } from "../../tagger";
import { substringFallbackNames } from "./shared";
import type { LinkThemesStepInput, MeetingThemeToWrite, SkippedDueToRejection } from "./types";

export interface BuildMeetingThemesResult {
  meetingThemesToWrite: MeetingThemeToWrite[];
  skippedDueToRejection: SkippedDueToRejection[];
}

/**
 * Step 2 — Bepaal welke `meeting_themes` rijen er moeten komen voor de
 * identified-themes. Filter tegen rejected pairs en bouw de summary-fallback
 * keten (Summarizer-map → Detector summary → null).
 *
 * Proposals worden later (in persist) toegevoegd aan dezelfde lijst als
 * merge-candidates of na createEmergingTheme.
 */
export function buildMeetingThemes(
  input: LinkThemesStepInput,
  verifiedThemes: ThemeRow[],
  rejectedThemeIds: Set<string>,
): BuildMeetingThemesResult {
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
    // TH-013 (FUNC-291) — Fallback-keten voor `meeting_themes.summary`:
    //   1. Summarizer's rijke markdown (primair, sinds TH-013)
    //   2. Theme-Detector's 1-2 zins `theme_summary` (fallback)
    //   3. null (laatste redmiddel — zou nooit moeten gebeuren bij identified)
    const summarizerSummary = input.summarizerThemeSummaries?.get(t.themeId);
    const resolvedSummary = summarizerSummary ?? t.theme_summary ?? null;

    meetingThemesToWrite.push({
      themeId: t.themeId,
      themeName: catalogEntry.name,
      confidence: t.confidence,
      evidenceQuote: t.relevance_quote,
      summary: resolvedSummary,
      source: "identified",
    });
  }

  return { meetingThemesToWrite, skippedDueToRejection };
}

/**
 * Step 3 — Per-extraction annotation-parsing voor extraction_themes.
 * Identified themes + knownThemes als resolve-context. Proposals tellen pas
 * mee na create (persist-flow), dus in dry-run zie je ze apart in
 * proposalsToCreate.
 */
export function buildExtractionThemes(
  detectorOutput: ThemeDetectorOutput,
  verifiedThemes: ThemeRow[],
  extractionRows: { id: string; content: string }[],
  rejectedThemeIds: Set<string>,
): ExtractionThemeRow[] {
  const identifiedRefs: ThemeRef[] = detectorOutput.identified_themes.map((t) => {
    const c = verifiedThemes.find((v) => v.id === t.themeId);
    return { themeId: t.themeId, name: c?.name ?? t.themeId };
  });
  const knownRefs: ThemeRef[] = verifiedThemes.map((t) => ({ themeId: t.id, name: t.name }));

  const identifiedThemeForConfidence = new Map<string, "medium" | "high">();
  for (const t of detectorOutput.identified_themes) {
    identifiedThemeForConfidence.set(t.themeId, t.confidence);
  }

  const extractionThemesToWrite: ExtractionThemeRow[] = [];
  for (const ex of extractionRows) {
    const names = parseThemesAnnotation(ex.content);
    // MB-6: substring-fallback matcht ALLEEN tegen identified_themes,
    // niet tegen de volle known-catalogus. Reden: de fallback heeft geen
    // LLM-bevestiging, en de `extraction_themes.confidence`-kolom accepteert
    // alleen 'medium'/'high'. Als we tegen arbitrary known themes zouden
    // matchen en daar default-`medium` aan geven, zouden zwakke signalen
    // dezelfde weight krijgen als echte LLM-matches. Door de fallback te
    // beperken tot identified_themes leunt elke geschreven rij op een
    // expliciete LLM-bevestiging op meeting-niveau, en bepaalt alleen de
    // substring welke extractie deze draagt.
    const fallbackNames =
      names.length === 0 ? substringFallbackNames(ex.content, identifiedRefs) : [];
    const refs = resolveThemeRefs([...names, ...fallbackNames], identifiedRefs, knownRefs);
    for (const ref of refs) {
      // Skip als het paar gerejected is — extraction_themes volgen
      // dezelfde rejection-policy als meeting_themes.
      if (rejectedThemeIds.has(ref.themeId)) continue;
      // Confidence komt altijd uit de detector-output; niet-identified
      // themes krijgen geen extraction-link (MB-6).
      const confidence = identifiedThemeForConfidence.get(ref.themeId);
      if (!confidence) continue;
      extractionThemesToWrite.push({
        extractionId: ex.id,
        themeId: ref.themeId,
        confidence,
      });
    }
  }
  return extractionThemesToWrite;
}

import type { ThemeRow, ThemeWithNegativeExamples } from "@repo/database/queries/themes";
import type { ExtractionThemeRow } from "@repo/database/mutations/extractions/themes";
import type { ThemeDetectorOutput } from "../../../validations/theme-detector";

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
  /**
   * MB-1 — Optionele cached verified-themes-lijst van de Detector-step.
   * Wanneer gevuld skipt link-themes de eigen `listVerifiedThemes()`-call
   * en hergebruikt de caller's resultaat. Voorkomt N-duplicate queries
   * in de hoofdpipeline (Detector + orchestrator + link = 3× zonder
   * cache).
   */
  verifiedThemes?: ThemeRow[] | ThemeWithNegativeExamples[];
  /**
   * TH-013 (FUNC-291) — Per-theme rijke markdown-summaries uit de
   * Summarizer. Key = theme UUID, value = output van `formatThemeSummary()`.
   * Wint boven Theme-Detector's 1-2 zins `theme_summary` bij het wegschrijven
   * van `meeting_themes.summary`. Ontbrekende themeId → fallback op Detector-
   * summary, dan null. Ontbrekende Map (undefined of leeg) → pre-TH-013 gedrag
   * (Detector-summary overal).
   */
  summarizerThemeSummaries?: Map<string, string>;
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

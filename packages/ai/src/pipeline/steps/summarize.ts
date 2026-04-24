import {
  runSummarizer,
  formatSummary,
  formatThemeSummary,
  type SummarizerIdentifiedTheme,
} from "../../agents/summarizer";
import { updateMeetingSummary } from "@repo/database/mutations/meetings";

export interface SummarizeResult {
  success: boolean;
  richSummary: string | null;
  kernpunten: string[];
  vervolgstappen: string[];
  /**
   * TH-013 (FUNC-290) — Per identified theme één rendered markdown-string
   * (briefing + kernpunten + vervolgstappen). Key = theme UUID, value =
   * output van `formatThemeSummary()`. Bij 0 identified_themes of bij
   * Summarizer-failure: lege Map (niet null, zodat consumers geen null-
   * checks hoeven).
   */
  themeSummaries: Map<string, string>;
  error: string | null;
}

/**
 * Run AI summarizer on best available transcript and persist to database.
 * Non-blocking: returns error info instead of throwing.
 */
export async function runSummarizeStep(
  meetingId: string,
  transcript: string,
  context: {
    title: string;
    meeting_type: string;
    party_type: string;
    participants: string[];
    speakerContext?: string | null;
    entityContext?: string;
    /** TH-013 — Themes met UUID zodat Summarizer theme_summaries[] kan produceren met correcte IDs. */
    identified_themes?: SummarizerIdentifiedTheme[];
  },
): Promise<SummarizeResult> {
  try {
    console.info("Summarizer starting...");
    const summarizerOutput = await runSummarizer(transcript, { ...context, meetingId });
    const richSummary = formatSummary(summarizerOutput);

    const themeSummaries = new Map<string, string>();
    for (const ts of summarizerOutput.theme_summaries) {
      // EDGE-241 defensive: briefing is schema-verplicht maar een lege string
      // zou een kaalle kaart opleveren. Skip lege briefings zodat link-themes
      // fallt terug op Detector-summary voor deze entry.
      if (!ts.briefing.trim()) {
        console.warn(
          `[summarize-step] lege briefing voor themeId=${ts.themeId} — overslaan, fallback op Detector`,
        );
        continue;
      }
      themeSummaries.set(ts.themeId, formatThemeSummary(ts));
    }

    const updateResult = await updateMeetingSummary(
      meetingId,
      richSummary,
      summarizerOutput.briefing,
    );

    if ("error" in updateResult) {
      console.error("Failed to save summary:", updateResult.error);
      return {
        success: false,
        richSummary,
        kernpunten: summarizerOutput.kernpunten,
        vervolgstappen: summarizerOutput.vervolgstappen,
        themeSummaries,
        error: updateResult.error,
      };
    }

    console.info(
      `Summarizer: ${summarizerOutput.kernpunten.length} kernpunten, ` +
        `${summarizerOutput.deelnemers.length} deelnemers, ${summarizerOutput.vervolgstappen.length} vervolgstappen, ` +
        `${themeSummaries.size} theme_summaries`,
    );
    return {
      success: true,
      richSummary,
      kernpunten: summarizerOutput.kernpunten,
      vervolgstappen: summarizerOutput.vervolgstappen,
      themeSummaries,
      error: null,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Summarizer failed (non-blocking):", errMsg);
    return {
      success: false,
      richSummary: null,
      kernpunten: [],
      vervolgstappen: [],
      themeSummaries: new Map(),
      error: errMsg,
    };
  }
}

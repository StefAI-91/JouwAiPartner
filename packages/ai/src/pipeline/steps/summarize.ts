import { runSummarizer, formatSummary } from "../../agents/summarizer";
import { updateMeetingSummary } from "@repo/database/mutations/meetings";

export interface SummarizeResult {
  success: boolean;
  richSummary: string | null;
  kernpunten: string[];
  vervolgstappen: string[];
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
    entityContext?: string;
  },
): Promise<SummarizeResult> {
  try {
    console.info("Summarizer starting...");
    const summarizerOutput = await runSummarizer(transcript, context);
    const richSummary = formatSummary(summarizerOutput);

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
        error: updateResult.error,
      };
    }

    console.info(
      `Summarizer: ${summarizerOutput.kernpunten.length} kernpunten, ` +
        `${summarizerOutput.deelnemers.length} deelnemers, ${summarizerOutput.vervolgstappen.length} vervolgstappen`,
    );
    return {
      success: true,
      richSummary,
      kernpunten: summarizerOutput.kernpunten,
      vervolgstappen: summarizerOutput.vervolgstappen,
      error: null,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Summarizer failed (non-blocking):", errMsg);
    return { success: false, richSummary: null, kernpunten: [], vervolgstappen: [], error: errMsg };
  }
}

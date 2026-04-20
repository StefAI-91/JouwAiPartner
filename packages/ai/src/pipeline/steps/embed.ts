import { embedMeetingWithExtractions } from "../embed-pipeline";

export interface EmbedStepResult {
  success: boolean;
  error: string | null;
}

/**
 * Final pipeline step: embed the meeting + its saved extractions.
 * Non-blocking — errors come back as strings so the caller can surface
 * them without aborting the rest of the pipeline.
 */
export async function runEmbedStep(meetingId: string): Promise<EmbedStepResult> {
  try {
    await embedMeetingWithExtractions(meetingId);
    return { success: true, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Embedding failed:", msg);
    return { success: false, error: msg };
  }
}

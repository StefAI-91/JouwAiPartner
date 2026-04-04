import { runExtractor, ExtractorOutput } from "../../agents/extractor";
import { saveExtractions } from "../save-extractions";
import { updateMeetingRawFireflies } from "@repo/database/mutations/meetings";

export interface ExtractResult {
  success: boolean;
  extractorOutput: ExtractorOutput | null;
  extractionsSaved: number;
  error: string | null;
}

/**
 * Run AI extractor on transcript, save extractions, and update pipeline metadata.
 * Non-blocking: returns error info instead of throwing.
 */
export async function runExtractStep(
  meetingId: string,
  transcript: string,
  context: {
    title: string;
    meeting_type: string;
    party_type: string;
    participants: string[];
    summary: string;
  },
  rawFireflies: Record<string, unknown>,
  transcriptSource: string,
): Promise<ExtractResult> {
  try {
    const extractorResult = await runExtractor(transcript, context);

    // Add extractor output to raw_fireflies pipeline metadata
    const updatedRawFireflies = {
      ...rawFireflies,
      pipeline: {
        ...(rawFireflies.pipeline as Record<string, unknown>),
        extractor: {
          extractions_count: extractorResult.extractions.length,
          entities: extractorResult.entities,
          primary_project: extractorResult.primary_project,
          transcript_source: transcriptSource,
        },
      },
    };

    await updateMeetingRawFireflies(meetingId, updatedRawFireflies);

    const saveResult = await saveExtractions(extractorResult, meetingId);

    console.info(
      `Extractor: ${saveResult.extractions_saved} extractions saved, project linked: ${saveResult.project_linked}`,
    );

    return {
      success: true,
      extractorOutput: extractorResult,
      extractionsSaved: saveResult.extractions_saved,
      error: null,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Extractor failed:", errMsg);
    return {
      success: false,
      extractorOutput: null,
      extractionsSaved: 0,
      error: errMsg,
    };
  }
}

import { runExtractor, ExtractorOutput } from "../../agents/extractor";
import { saveExtractions } from "../save-extractions";
import { updateMeetingRawFireflies } from "@repo/database/mutations/meetings";
import type { IdentifiedProject } from "../../validations/gatekeeper";

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
    speakerContext?: string | null;
    summary: string;
    meeting_date: string;
    entityContext?: string;
  },
  rawFireflies: Record<string, unknown>,
  transcriptSource: string,
  identifiedProjects: IdentifiedProject[],
): Promise<ExtractResult> {
  try {
    const extractorResult = await runExtractor(transcript, {
      ...context,
      identified_projects: identifiedProjects.map((p) => ({
        project_name: p.project_name,
        project_id: p.project_id,
      })),
    });

    // Add extractor output to raw_fireflies pipeline metadata
    const updatedRawFireflies = {
      ...rawFireflies,
      pipeline: {
        ...(rawFireflies.pipeline as Record<string, unknown>),
        extractor: {
          extractions_count: extractorResult.extractions.length,
          entities: extractorResult.entities,
          transcript_source: transcriptSource,
        },
      },
    };

    await updateMeetingRawFireflies(meetingId, updatedRawFireflies);

    const saveResult = await saveExtractions(extractorResult, meetingId, identifiedProjects);

    console.info(
      `Extractor: ${saveResult.extractions_saved} extractions saved, ${saveResult.projects_linked} projects linked`,
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

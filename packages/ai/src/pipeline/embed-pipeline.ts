import { embedText, embedBatch } from "../embeddings";
import { updateRowEmbedding, batchUpdateEmbeddings } from "@repo/database/mutations/embeddings";
import {
  getMeetingExtractions,
  getMeetingForEmbedding,
  getExtractionIdsAndContent,
} from "@repo/database/queries/meetings";
import { buildMeetingEmbedText } from "./embed-text";

/**
 * Embed a meeting and all its extractions right after pipeline processing.
 * Called synchronously after extraction to make content immediately searchable.
 */
export async function embedMeetingWithExtractions(meetingId: string): Promise<void> {
  const meeting = await getMeetingForEmbedding(meetingId);
  if (!meeting) {
    throw new Error(`Failed to fetch meeting ${meetingId} for embedding`);
  }

  // Fetch extractions for enriched embed text
  const extractions = await getMeetingExtractions(meetingId);

  // Embed meeting (enriched with extractions)
  const meetingText = buildMeetingEmbedText(meeting, extractions);
  const meetingEmbedding = await embedText(meetingText);
  const meetingResult = await updateRowEmbedding("meetings", meetingId, meetingEmbedding);
  if ("error" in meetingResult) {
    throw new Error(`Failed to save meeting embedding: ${meetingResult.error}`);
  }

  // Embed individual extractions in batch
  const extractionRows = await getExtractionIdsAndContent(meetingId);
  if (extractionRows.length > 0) {
    const texts = extractionRows.map((e) => e.content);
    const embeddings = await embedBatch(texts);
    const ids = extractionRows.map((e) => e.id);

    const result = await batchUpdateEmbeddings("extractions", ids, embeddings);
    if ("error" in result) {
      console.error(`Failed to batch embed extractions for meeting ${meetingId}: ${result.error}`);
    }
  }
}

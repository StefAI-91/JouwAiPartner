import { embedText, embedBatch } from "../embeddings";
import { updateRowEmbedding, batchUpdateEmbeddings } from "@repo/database/mutations/embeddings";
import { getMeetingExtractions } from "@repo/database/queries/meetings";
import { getAdminClient } from "@repo/database/supabase/admin";

/**
 * Build rich embed text for a meeting including its extractions.
 */
function buildMeetingEmbedText(
  meeting: { title: string; participants: string[]; summary: string },
  extractions: { type: string; content: string }[],
): string {
  const parts: string[] = [];

  parts.push(`Meeting: ${meeting.title}`);
  if (meeting.participants.length) {
    parts.push(`Deelnemers: ${meeting.participants.join(", ")}`);
  }
  if (meeting.summary) parts.push(`Samenvatting: ${meeting.summary}`);

  const grouped: Record<string, string[]> = {};
  for (const e of extractions) {
    if (!grouped[e.type]) grouped[e.type] = [];
    grouped[e.type].push(e.content);
  }

  const typeLabels: Record<string, string> = {
    decision: "Besluiten",
    action_item: "Actiepunten",
    insight: "Inzichten",
    need: "Behoeften",
  };

  for (const [type, items] of Object.entries(grouped)) {
    const label = typeLabels[type] || type;
    parts.push(`${label}:\n` + items.map((item) => `- ${item}`).join("\n"));
  }

  return parts.join("\n\n");
}

/**
 * Embed a meeting and all its extractions right after pipeline processing.
 * Called synchronously after extraction to make content immediately searchable.
 */
export async function embedMeetingWithExtractions(meetingId: string): Promise<void> {
  // Fetch meeting data
  const { data: meeting, error } = await getAdminClient()
    .from("meetings")
    .select("title, participants, summary")
    .eq("id", meetingId)
    .single();

  if (error || !meeting) {
    throw new Error(`Failed to fetch meeting ${meetingId}: ${error?.message}`);
  }

  // Fetch extractions
  const extractions = await getMeetingExtractions(meetingId);

  // Embed meeting (enriched with extractions)
  const meetingText = buildMeetingEmbedText(meeting, extractions);
  const meetingEmbedding = await embedText(meetingText);
  const meetingResult = await updateRowEmbedding("meetings", meetingId, meetingEmbedding);
  if ("error" in meetingResult) {
    throw new Error(`Failed to save meeting embedding: ${meetingResult.error}`);
  }

  // Embed individual extractions in batch (fixes N+1: Q-01)
  if (extractions.length > 0) {
    const { data: extractionRows } = await getAdminClient()
      .from("extractions")
      .select("id, content")
      .eq("meeting_id", meetingId);

    if (extractionRows && extractionRows.length > 0) {
      const texts = extractionRows.map((e) => e.content);
      const embeddings = await embedBatch(texts);
      const ids = extractionRows.map((e) => e.id);

      const result = await batchUpdateEmbeddings("extractions", ids, embeddings);
      if ("error" in result) {
        console.error(`Failed to batch embed extractions for meeting ${meetingId}: ${result.error}`);
      }
    }
  }
}

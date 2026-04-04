import { getAdminClient } from "../supabase/admin";

export async function deleteExtractionsByMeetingId(
  meetingId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("extractions")
    .delete()
    .eq("meeting_id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getExtractionForCorrection(
  extractionId: string,
): Promise<{ id: string; content: string; metadata: Record<string, unknown> | null; type: string; meeting_id: string } | null> {
  const { data, error } = await getAdminClient()
    .from("extractions")
    .select("id, content, metadata, type, meeting_id")
    .eq("id", extractionId)
    .single();

  if (error || !data) return null;
  return data as { id: string; content: string; metadata: Record<string, unknown> | null; type: string; meeting_id: string };
}

export async function correctExtraction(
  extractionId: string,
  updates: {
    content?: string;
    metadata?: Record<string, unknown>;
    corrected_by: string | null;
  },
): Promise<{ success: true } | { error: string }> {
  const updatePayload: Record<string, unknown> = {
    corrected_by: updates.corrected_by,
    corrected_at: new Date().toISOString(),
    embedding_stale: true,
  };

  if (updates.content) updatePayload.content = updates.content;
  if (updates.metadata) updatePayload.metadata = updates.metadata;

  const { error } = await getAdminClient()
    .from("extractions")
    .update(updatePayload)
    .eq("id", extractionId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function insertExtractions(
  rows: {
    meeting_id: string;
    type: string;
    content: string;
    confidence: number;
    transcript_ref: string | null;
    metadata: Record<string, unknown>;
    project_id: string | null;
    embedding_stale: boolean;
    verification_status: string;
  }[],
): Promise<{ success: true; count: number } | { error: string }> {
  if (rows.length === 0) return { success: true, count: 0 };

  const { error } = await getAdminClient().from("extractions").insert(rows);

  if (error) return { error: error.message };
  return { success: true, count: rows.length };
}

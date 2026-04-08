import { getAdminClient } from "../supabase/admin";

export async function deleteExtractionsByMeetingId(
  meetingId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient().from("extractions").delete().eq("meeting_id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getExtractionForCorrection(
  extractionId: string,
): Promise<{
  id: string;
  content: string;
  metadata: Record<string, unknown> | null;
  type: string;
  meeting_id: string;
} | null> {
  const { data, error } = await getAdminClient()
    .from("extractions")
    .select("id, content, metadata, type, meeting_id")
    .eq("id", extractionId)
    .single();

  if (error || !data) return null;
  return data as {
    id: string;
    content: string;
    metadata: Record<string, unknown> | null;
    type: string;
    meeting_id: string;
  };
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

export async function createExtraction(data: {
  meeting_id: string;
  type: string;
  content: string;
  confidence?: number | null;
  transcript_ref?: string | null;
  metadata?: Record<string, unknown>;
  organization_id?: string | null;
  project_id?: string | null;
  verification_status?: string;
}): Promise<{ success: true; data: { id: string } } | { error: string }> {
  const { data: extraction, error } = await getAdminClient()
    .from("extractions")
    .insert({
      meeting_id: data.meeting_id,
      type: data.type,
      content: data.content,
      confidence: data.confidence ?? null,
      transcript_ref: data.transcript_ref ?? null,
      metadata: data.metadata ?? {},
      organization_id: data.organization_id ?? null,
      project_id: data.project_id ?? null,
      verification_status: data.verification_status ?? "verified",
      embedding_stale: true,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { success: true, data: extraction };
}

export async function updateExtraction(
  extractionId: string,
  data: {
    content?: string;
    metadata?: Record<string, unknown>;
    transcript_ref?: string | null;
    type?: string;
  },
  correctedBy?: string,
): Promise<{ success: true } | { error: string }> {
  const updateData: Record<string, unknown> = {
    ...data,
    embedding_stale: true,
  };

  if (correctedBy) {
    updateData.corrected_by = correctedBy;
    updateData.corrected_at = new Date().toISOString();
  }

  const { error } = await getAdminClient()
    .from("extractions")
    .update(updateData)
    .eq("id", extractionId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteExtraction(
  extractionId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient().from("extractions").delete().eq("id", extractionId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateNeedStatus(
  needId: string,
  status: string,
): Promise<{ success: true } | { error: string }> {
  const db = getAdminClient();

  // Fetch current metadata to merge
  const { data: current, error: fetchError } = await db
    .from("extractions")
    .select("metadata")
    .eq("id", needId)
    .eq("type", "need")
    .single();

  if (fetchError || !current) return { error: fetchError?.message ?? "Need not found" };

  const metadata = { ...(current.metadata as Record<string, unknown>), status };

  const { error } = await db.from("extractions").update({ metadata }).eq("id", needId);

  if (error) return { error: error.message };
  return { success: true };
}

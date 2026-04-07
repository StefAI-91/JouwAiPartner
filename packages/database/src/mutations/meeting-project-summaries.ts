import { getAdminClient } from "../supabase/admin";

interface SegmentInsert {
  meeting_id: string;
  project_id: string | null;
  project_name_raw: string | null;
  kernpunten: string[];
  vervolgstappen: string[];
  summary_text: string;
  embedding?: number[] | null;
  embedding_stale?: boolean;
}

/**
 * Insert meeting project summaries (segments) in batch.
 * Idempotent: verwijdert eerst bestaande segmenten voor de meeting,
 * zodat herverwerking geen duplicaten oplevert.
 */
export async function insertMeetingProjectSummaries(
  segments: SegmentInsert[],
): Promise<{ success: true; ids: string[] } | { error: string }> {
  if (segments.length === 0) return { success: true, ids: [] };

  const db = getAdminClient();
  const meetingId = segments[0].meeting_id;

  // Verwijder bestaande segmenten voor deze meeting (idempotentie)
  const { error: deleteErr } = await db
    .from("meeting_project_summaries")
    .delete()
    .eq("meeting_id", meetingId);

  if (deleteErr) return { error: `Delete existing segments: ${deleteErr.message}` };

  const rows = segments.map((s) => ({
    meeting_id: s.meeting_id,
    project_id: s.project_id,
    project_name_raw: s.project_name_raw,
    kernpunten: s.kernpunten,
    vervolgstappen: s.vervolgstappen,
    summary_text: s.summary_text,
    embedding: s.embedding ? (s.embedding as unknown as string) : null,
    embedding_stale: s.embedding_stale ?? true,
  }));

  const { data, error } = await db.from("meeting_project_summaries").insert(rows).select("id");

  if (error) return { error: error.message };
  return { success: true, ids: (data ?? []).map((r) => r.id) };
}

/**
 * Link a segment to an existing project (reviewer correction).
 * Sets embedding_stale=true so re-embed worker picks it up.
 */
export async function linkSegmentToProject(
  segmentId: string,
  projectId: string,
): Promise<{ success: true } | { error: string }> {
  const { data, error } = await getAdminClient()
    .from("meeting_project_summaries")
    .update({ project_id: projectId, embedding_stale: true })
    .eq("id", segmentId)
    .select("id");

  if (error) {
    console.error("[linkSegmentToProject] Update failed:", error.message, { segmentId, projectId });
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    console.error("[linkSegmentToProject] No rows updated — segment not found:", segmentId);
    return { error: "Segment niet gevonden" };
  }
  return { success: true };
}

/**
 * Move items from a segment to the Algemeen segment and delete the empty one.
 * Uses a PostgreSQL function for transactional safety — all-or-nothing.
 */
export async function removeSegmentTag(
  segmentId: string,
  meetingId: string,
): Promise<{ success: true } | { error: string }> {
  const { data, error } = await getAdminClient().rpc("merge_segment_to_general", {
    p_segment_id: segmentId,
    p_meeting_id: meetingId,
  });

  if (error) return { error: error.message };

  const result = data as { error?: string; success?: boolean };
  if (result.error) return { error: result.error };

  return { success: true };
}

/**
 * Update a single segment's embedding.
 */
export async function updateSegmentEmbedding(
  id: string,
  embedding: number[],
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meeting_project_summaries")
    .update({
      embedding: embedding as unknown as string,
      embedding_stale: false,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

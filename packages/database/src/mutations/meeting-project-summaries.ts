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
 */
export async function insertMeetingProjectSummaries(
  segments: SegmentInsert[],
): Promise<{ success: true; ids: string[] } | { error: string }> {
  if (segments.length === 0) return { success: true, ids: [] };

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

  const { data, error } = await getAdminClient()
    .from("meeting_project_summaries")
    .insert(rows)
    .select("id");

  if (error) return { error: error.message };
  return { success: true, ids: (data ?? []).map((r) => r.id) };
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

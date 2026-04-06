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
 * Link a segment to an existing project (reviewer correction).
 * Sets embedding_stale=true so re-embed worker picks it up.
 */
export async function linkSegmentToProject(
  segmentId: string,
  projectId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meeting_project_summaries")
    .update({ project_id: projectId, embedding_stale: true })
    .eq("id", segmentId);

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Move items from a segment to the Algemeen segment and delete the empty one.
 * If no Algemeen segment exists for this meeting, creates one.
 * Sets embedding_stale=true on both affected segments.
 */
export async function removeSegmentTag(
  segmentId: string,
  meetingId: string,
): Promise<{ success: true } | { error: string }> {
  const db = getAdminClient();

  // Get the segment to remove
  const { data: segment, error: fetchErr } = await db
    .from("meeting_project_summaries")
    .select("id, kernpunten, vervolgstappen")
    .eq("id", segmentId)
    .single();

  if (fetchErr || !segment) return { error: fetchErr?.message ?? "Segment niet gevonden" };

  // Find existing Algemeen segment (project_id IS NULL and is_general = true)
  const { data: generalSegments } = await db
    .from("meeting_project_summaries")
    .select("id, kernpunten, vervolgstappen, summary_text")
    .eq("meeting_id", meetingId)
    .is("project_id", null)
    .neq("id", segmentId)
    .limit(1);

  const generalSegment = generalSegments?.[0];

  if (generalSegment) {
    // Merge items into existing Algemeen segment
    const mergedKernpunten = [...(generalSegment.kernpunten ?? []), ...(segment.kernpunten ?? [])];
    const mergedVervolgstappen = [
      ...(generalSegment.vervolgstappen ?? []),
      ...(segment.vervolgstappen ?? []),
    ];
    const summaryText = formatGeneralSummaryText(mergedKernpunten, mergedVervolgstappen);

    const { error: updateErr } = await db
      .from("meeting_project_summaries")
      .update({
        kernpunten: mergedKernpunten,
        vervolgstappen: mergedVervolgstappen,
        summary_text: summaryText,
        embedding_stale: true,
      })
      .eq("id", generalSegment.id);

    if (updateErr) return { error: updateErr.message };
  } else {
    // Create new Algemeen segment
    const summaryText = formatGeneralSummaryText(
      segment.kernpunten ?? [],
      segment.vervolgstappen ?? [],
    );

    const { error: insertErr } = await db.from("meeting_project_summaries").insert({
      meeting_id: meetingId,
      project_id: null,
      project_name_raw: null,
      kernpunten: segment.kernpunten ?? [],
      vervolgstappen: segment.vervolgstappen ?? [],
      summary_text: summaryText,
      embedding_stale: true,
    });

    if (insertErr) return { error: insertErr.message };
  }

  // Delete the now-empty segment
  const { error: deleteErr } = await db
    .from("meeting_project_summaries")
    .delete()
    .eq("id", segmentId);

  if (deleteErr) return { error: deleteErr.message };
  return { success: true };
}

function formatGeneralSummaryText(kernpunten: string[], vervolgstappen: string[]): string {
  const lines = ["Algemeen (niet project-specifiek):"];
  if (kernpunten.length > 0) {
    lines.push("Kernpunten:");
    for (const k of kernpunten) lines.push(`- ${k}`);
  }
  if (vervolgstappen.length > 0) {
    lines.push("Vervolgstappen:");
    for (const v of vervolgstappen) lines.push(`- ${v}`);
  }
  return lines.join("\n");
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

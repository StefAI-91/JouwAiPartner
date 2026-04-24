import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

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
 * Move items from a segment to the Algemeen segment and delete the source.
 * Merges kernpunten/vervolgstappen into the general (project_id IS NULL) segment.
 */
export async function removeSegmentTag(
  segmentId: string,
  meetingId: string,
): Promise<{ success: true } | { error: string }> {
  const db = getAdminClient();

  // 1. Get the segment to be removed
  const { data: segment, error: segErr } = await db
    .from("meeting_project_summaries")
    .select("id, kernpunten, vervolgstappen")
    .eq("id", segmentId)
    .single();

  if (segErr || !segment) return { error: "Segment niet gevonden" };

  // 2. Find existing Algemeen segment (project_id IS NULL, not the one being removed)
  const { data: general } = await db
    .from("meeting_project_summaries")
    .select("id, kernpunten, vervolgstappen")
    .eq("meeting_id", meetingId)
    .is("project_id", null)
    .neq("id", segmentId)
    .limit(1)
    .single();

  const srcKernpunten: string[] = segment.kernpunten ?? [];
  const srcVervolgstappen: string[] = segment.vervolgstappen ?? [];

  if (general) {
    // 3a. Merge into existing Algemeen segment
    const mergedKernpunten = [...(general.kernpunten ?? []), ...srcKernpunten];
    const mergedVervolgstappen = [...(general.vervolgstappen ?? []), ...srcVervolgstappen];
    const summaryText = buildGeneralSummaryText(mergedKernpunten, mergedVervolgstappen);

    const { error: updateErr } = await db
      .from("meeting_project_summaries")
      .update({
        kernpunten: mergedKernpunten,
        vervolgstappen: mergedVervolgstappen,
        summary_text: summaryText,
        embedding_stale: true,
      })
      .eq("id", general.id);

    if (updateErr) return { error: updateErr.message };
  } else {
    // 3b. Create new Algemeen segment
    const summaryText = buildGeneralSummaryText(srcKernpunten, srcVervolgstappen);

    const { error: insertErr } = await db.from("meeting_project_summaries").insert({
      meeting_id: meetingId,
      project_id: null,
      project_name_raw: null,
      kernpunten: srcKernpunten,
      vervolgstappen: srcVervolgstappen,
      summary_text: summaryText,
      embedding_stale: true,
    });

    if (insertErr) return { error: insertErr.message };
  }

  // 4. Delete the source segment
  const { error: delErr } = await db.from("meeting_project_summaries").delete().eq("id", segmentId);

  if (delErr) return { error: delErr.message };

  return { success: true };
}

function buildGeneralSummaryText(kernpunten: string[], vervolgstappen: string[]): string {
  let text = "Algemeen (niet project-specifiek):";
  if (kernpunten.length > 0) {
    text += "\nKernpunten:";
    for (const k of kernpunten) text += `\n- ${k}`;
  }
  if (vervolgstappen.length > 0) {
    text += "\nVervolgstappen:";
    for (const v of vervolgstappen) text += `\n- ${v}`;
  }
  return text;
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

/**
 * Q2b-B: standalone delete-by-meeting-id voor de regenerate-flow. Apart van
 * `insertMeetingProjectSummaries` (die de delete intern doet) zodat de
 * regenerate-actie de segments kan opruimen voordat de tagger draait —
 * idempotent: bij een crash herstelt de volgende run de segments alsnog.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function deleteSegmentsByMeetingId(
  meetingId: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db.from("meeting_project_summaries").delete().eq("meeting_id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

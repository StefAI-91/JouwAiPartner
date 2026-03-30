import { listFirefliesTranscripts, fetchFirefliesTranscript } from "@/lib/fireflies";
import { chunkTranscript } from "@/lib/transcript-processor";
import { getMeetingByFirefliesId } from "@/lib/queries/meetings";
import { isValidDuration, hasParticipants } from "@/lib/validations/fireflies";
import { processMeeting } from "@/lib/services/gatekeeper-pipeline";
import { runReEmbedWorker } from "@/lib/services/re-embed-worker";

export interface IngestResult {
  id: string;
  title: string;
  status: "imported" | "skipped" | "failed";
  reason?: string;
  relevance_score?: number;
  meeting_type?: string;
  extractions_saved?: number;
  embedded?: boolean;
  errors?: string[];
}

export async function ingestFirefliesTranscripts(limit: number) {
  const transcripts = await listFirefliesTranscripts(limit);

  if (transcripts.length === 0) {
    return {
      summary: { total: 0, imported: 0, skipped: 0, failed: 0 },
      embeddings: null,
      results: [] as IngestResult[],
    };
  }

  const results: IngestResult[] = [];

  for (const item of transcripts) {
    const existing = await getMeetingByFirefliesId(item.id);
    if (existing) {
      results.push({
        id: item.id,
        title: item.title,
        status: "skipped",
        reason: "already_imported",
      });
      continue;
    }

    const transcript = await fetchFirefliesTranscript(item.id);
    if (!transcript) {
      results.push({
        id: item.id,
        title: item.title,
        status: "failed",
        reason: "fetch_failed",
      });
      continue;
    }

    const durationCheck = isValidDuration(transcript.sentences);
    if (!durationCheck.valid) {
      results.push({
        id: item.id,
        title: item.title,
        status: "skipped",
        reason: `too_short (${durationCheck.duration.toFixed(1)}min)`,
      });
      continue;
    }

    if (!hasParticipants(transcript.participants)) {
      results.push({
        id: item.id,
        title: item.title,
        status: "skipped",
        reason: "no_participants",
      });
      continue;
    }

    try {
      const chunks = chunkTranscript(transcript.sentences);
      const chunkedTranscript = chunks.map((c) => c.text).join("\n\n---\n\n");

      const pipelineResult = await processMeeting({
        fireflies_id: item.id,
        title: transcript.title,
        date: transcript.date,
        participants: transcript.participants,
        summary: transcript.summary?.notes ?? "",
        topics: transcript.summary?.topics_discussed ?? [],
        transcript: chunkedTranscript,
        raw_fireflies: {
          fireflies_id: item.id,
          title: transcript.title,
          date: transcript.date,
          participants: transcript.participants,
          summary: transcript.summary,
        },
      });

      results.push({
        id: item.id,
        title: transcript.title,
        status: pipelineResult.meetingId ? "imported" : "failed",
        reason: pipelineResult.meetingId ? undefined : "insert_failed",
        relevance_score: pipelineResult.gatekeeper.relevance_score,
        meeting_type: pipelineResult.gatekeeper.meeting_type,
        extractions_saved: pipelineResult.extractions_saved,
        embedded: pipelineResult.embedded,
        errors: pipelineResult.errors.length > 0 ? pipelineResult.errors : undefined,
      });
    } catch (err) {
      results.push({
        id: item.id,
        title: item.title,
        status: "failed",
        reason: err instanceof Error ? err.message : "unknown_error",
      });
    }
  }

  const imported = results.filter((r) => r.status === "imported").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "failed").length;

  let embedResult = null;
  if (imported > 0) {
    embedResult = await runReEmbedWorker();
  }

  return {
    summary: { total: results.length, imported, skipped, failed },
    embeddings: embedResult ? { processed: embedResult.total, byTable: embedResult.byTable } : null,
    results,
  };
}

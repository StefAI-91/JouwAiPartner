import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listFirefliesTranscripts, fetchFirefliesTranscript } from "@/lib/fireflies";
import { chunkTranscript } from "@/lib/transcript-processor";
import { getMeetingByFirefliesId } from "@/lib/queries/meetings";
import { isValidDuration, hasParticipants } from "@/lib/validations/fireflies";
import { processMeeting } from "@/lib/services/gatekeeper-pipeline";
import { runReEmbedWorker } from "@/lib/services/re-embed-worker";

const ingestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
});

interface IngestResult {
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

export async function POST(req: NextRequest) {
  // TODO: Auth tijdelijk uit voor debugging — weer aanzetten
  // const authHeader = req.headers.get("authorization");
  // const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
  // if (process.env.CRON_SECRET && authHeader !== expectedToken) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  const body = await req.json().catch(() => ({}));
  const parsed = ingestSchema.safeParse(body);
  const limit = parsed.success ? parsed.data.limit : 20;

  // Step 1: List recent transcripts from Fireflies
  const transcripts = await listFirefliesTranscripts(limit);

  if (transcripts.length === 0) {
    return NextResponse.json({
      summary: { total: 0, imported: 0, skipped: 0, failed: 0 },
      embeddings: null,
      results: [],
    });
  }

  const results: IngestResult[] = [];

  for (const item of transcripts) {
    // Idempotency — skip already imported (novelty check on fireflies_id)
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

    // Fetch full transcript
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

    // Pre-filters
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

    // Chunk and process through gatekeeper
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

  // Generate embeddings for all stale rows
  let embedResult = null;
  if (imported > 0) {
    embedResult = await runReEmbedWorker();
  }

  return NextResponse.json({
    summary: { total: results.length, imported, skipped, failed },
    embeddings: embedResult ? { processed: embedResult.total, byTable: embedResult.byTable } : null,
    results,
  });
}

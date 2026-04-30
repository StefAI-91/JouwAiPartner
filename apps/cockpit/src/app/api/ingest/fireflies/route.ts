import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listFirefliesTranscripts, fetchFirefliesTranscript } from "@repo/ai/fireflies";
import { chunkTranscript } from "@repo/ai/transcript-processor";
import {
  getExistingFirefliesIds,
  getExistingMeetingsByTitleDates,
} from "@repo/database/queries/meetings";
import { isValidDuration } from "@repo/ai/validations/fireflies";
import { processMeeting } from "@repo/ai/pipeline/gatekeeper";
import { runReEmbedWorker } from "@repo/ai/pipeline/embed/re-embed-worker";

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

// Vercel Pro allows up to 800s, set to 600s to be safe
export const maxDuration = 600;

async function runIngest(limit: number, maxNew: number = Infinity) {
  // Step 1: List recent transcripts from Fireflies
  const transcripts = await listFirefliesTranscripts(limit);

  if (transcripts.length === 0) {
    return {
      summary: { total: 0, imported: 0, skipped: 0, failed: 0 },
      embeddings: null,
      results: [],
    };
  }

  const results: IngestResult[] = [];
  let importedCount = 0;

  // Batch pre-fetch: check which fireflies_ids and title+date combos already exist (avoids N+1)
  const existingFirefliesIds = await getExistingFirefliesIds(transcripts.map((t) => t.id));
  const titleDatePairs = transcripts
    .filter((t) => t.title && t.date)
    .map((t) => ({ title: t.title, date: new Date(Number(t.date)).toISOString() }));
  const existingTitleDates = await getExistingMeetingsByTitleDates(titleDatePairs);

  for (const item of transcripts) {
    // Stop processing if we've hit the max new meetings for this run
    if (importedCount >= maxNew) break;

    // Idempotency — skip already imported (from batch lookup)
    if (existingFirefliesIds.has(item.id)) {
      results.push({
        id: item.id,
        title: item.title,
        status: "skipped",
        reason: "already_imported",
      });
      continue;
    }

    // Dedup — check title+date combo (from batch lookup)
    if (item.title && item.date) {
      const dayStr = new Date(Number(item.date)).toISOString().slice(0, 10);
      const duplicateId = existingTitleDates.get(`${item.title.toLowerCase()}|${dayStr}`);
      if (duplicateId) {
        results.push({
          id: item.id,
          title: item.title,
          status: "skipped",
          reason: `duplicate_meeting (exists as ${duplicateId})`,
        });
        continue;
      }
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

    // Chunk and process through gatekeeper
    try {
      const chunks = chunkTranscript(transcript.sentences);
      const chunkedTranscript = chunks.map((c) => c.text).join("\n\n---\n\n");

      const pipelineResult = await processMeeting({
        fireflies_id: item.id,
        title: transcript.title,
        date: transcript.date,
        participants: transcript.participants,
        organizer_email: transcript.organizer_email,
        meeting_attendees: transcript.meeting_attendees ?? [],
        sentences: transcript.sentences,
        summary: transcript.summary?.notes ?? "",
        topics: transcript.summary?.topics_discussed ?? [],
        transcript: chunkedTranscript,
        raw_fireflies: {
          fireflies_id: item.id,
          title: transcript.title,
          date: transcript.date,
          participants: transcript.participants,
          organizer_email: transcript.organizer_email,
          meeting_attendees: transcript.meeting_attendees,
          summary: transcript.summary,
          sentences: transcript.sentences,
        },
        audio_url: transcript.audio_url ?? undefined,
      });

      const imported = !!pipelineResult.meetingId;
      if (imported) importedCount++;

      results.push({
        id: item.id,
        title: transcript.title,
        status: imported ? "imported" : "failed",
        reason: imported ? undefined : "insert_failed",
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

  const totalImported = results.filter((r) => r.status === "imported").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "failed").length;

  // Generate embeddings for all stale rows
  let embedResult = null;
  if (totalImported > 0) {
    embedResult = await runReEmbedWorker();
  }

  return {
    summary: { total: results.length, imported: totalImported, skipped, failed },
    embeddings: embedResult ? { processed: embedResult.total, byTable: embedResult.byTable } : null,
    results,
  };
}

function verifyAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
  return !!(process.env.CRON_SECRET && authHeader === expectedToken);
}

// Vercel Cron calls GET automatically
export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Process max 1 new meeting per cron run to stay within Vercel timeout
  const result = await runIngest(20, 1);
  return NextResponse.json(result);
}

// Manual ingest with configurable limit
export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = ingestSchema.safeParse(body);
  const limit = parsed.success ? parsed.data.limit : 20;

  const result = await runIngest(limit);
  return NextResponse.json(result);
}

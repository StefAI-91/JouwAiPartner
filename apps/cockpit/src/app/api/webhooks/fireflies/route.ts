import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { fetchFirefliesTranscript } from "@repo/ai/fireflies";
import { chunkTranscript } from "@repo/ai/transcript-processor";
import { getMeetingByFirefliesId, getMeetingByTitleAndDate } from "@repo/database/queries/meetings";
import { isValidDuration } from "@repo/ai/validations/fireflies";
import { processMeeting } from "@repo/ai/pipeline/gatekeeper-pipeline";

function verifyFirefliesSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.FIREFLIES_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expectedSignature = createHmac("sha256", secret).update(rawBody).digest("hex");
  return signature === expectedSignature;
}

export async function POST(req: NextRequest) {
  // Verify Fireflies HMAC signature (x-hub-signature header)
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature");

  if (!verifyFirefliesSignature(rawBody, signature)) {
    console.error("[webhook/fireflies] Signature verification failed", {
      hasSecret: !!process.env.FIREFLIES_WEBHOOK_SECRET,
      hasSignature: !!signature,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const { meetingId, eventType } = payload;

  // Only process completed transcriptions
  if (eventType !== "Transcription completed" || !meetingId) {
    return NextResponse.json({ skipped: true });
  }

  // Idempotency — skip if already ingested (novelty check on fireflies_id)
  const existing = await getMeetingByFirefliesId(meetingId);
  if (existing) {
    return NextResponse.json({ skipped: true, reason: "duplicate" });
  }

  // Fetch full transcript from Fireflies
  const transcript = await fetchFirefliesTranscript(meetingId);

  if (!transcript) {
    return NextResponse.json({ error: "Failed to fetch transcript" }, { status: 502 });
  }

  // Dedup — Fireflies creates separate transcripts per team member for the same meeting.
  if (transcript.title && transcript.date) {
    const dateStr = new Date(Number(transcript.date)).toISOString();
    const duplicate = await getMeetingByTitleAndDate(transcript.title, dateStr);
    if (duplicate) {
      return NextResponse.json({
        skipped: true,
        reason: "duplicate_meeting",
        existing_id: duplicate.id,
      });
    }
  }

  // Pre-filter: duration < 2 minutes (test calls, accidental recordings)
  const durationCheck = isValidDuration(transcript.sentences);
  if (!durationCheck.valid) {
    return NextResponse.json({
      skipped: true,
      reason: "too_short",
      duration: durationCheck.duration,
    });
  }

  // Chunk the transcript for storage
  const chunks = chunkTranscript(transcript.sentences);
  const chunkedTranscript = chunks.map((c) => c.text).join("\n\n---\n\n");

  // Run through full pipeline (Gatekeeper → insert → Extractor → save → embed)
  try {
    const pipelineResult = await processMeeting({
      fireflies_id: meetingId,
      title: transcript.title,
      date: transcript.date,
      participants: transcript.participants,
      summary: transcript.summary?.notes ?? "",
      topics: transcript.summary?.topics_discussed ?? [],
      transcript: chunkedTranscript,
      raw_fireflies: {
        fireflies_id: meetingId,
        title: transcript.title,
        date: transcript.date,
        participants: transcript.participants,
        summary: transcript.summary,
        sentences: transcript.sentences,
      },
      audio_url: transcript.audio_url ?? undefined,
    });

    if (pipelineResult.errors.length > 0) {
      console.error("[webhook/fireflies] Pipeline completed with errors", {
        meetingId: pipelineResult.meetingId,
        title: transcript.title,
        errors: pipelineResult.errors,
      });
    }

    return NextResponse.json({
      success: !!pipelineResult.meetingId,
      meetingId: pipelineResult.meetingId,
      meeting_type: pipelineResult.gatekeeper.meeting_type,
      party_type: pipelineResult.partyType,
      relevance_score: pipelineResult.gatekeeper.relevance_score,
      extractions_saved: pipelineResult.extractions_saved,
      embedded: pipelineResult.embedded,
      elevenlabs_transcribed: pipelineResult.elevenlabs_transcribed,
      summarized: pipelineResult.summarized,
      errors: pipelineResult.errors.length > 0 ? pipelineResult.errors : undefined,
    });
  } catch (err) {
    console.error("[webhook/fireflies] Pipeline crashed", {
      fireflies_id: meetingId,
      title: transcript.title,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Pipeline failed", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}

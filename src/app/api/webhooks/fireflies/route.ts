import { NextRequest, NextResponse } from "next/server";
import { fetchFirefliesTranscript } from "@/lib/fireflies";
import { chunkTranscript } from "@/lib/transcript-processor";
import { getMeetingByFirefliesId } from "@/lib/queries/meetings";
import { isValidDuration, hasParticipants } from "@/lib/validations/fireflies";
import { processMeeting } from "@/lib/services/gatekeeper-pipeline";

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const { meetingId, eventType } = payload;

  // Only process completed transcriptions
  if (eventType !== "Transcription completed" || !meetingId) {
    return NextResponse.json({ skipped: true });
  }

  // Idempotency — skip if already ingested
  const existing = await getMeetingByFirefliesId(meetingId);
  if (existing) {
    return NextResponse.json({ skipped: true, reason: "duplicate" });
  }

  // Fetch full transcript from Fireflies
  const transcript = await fetchFirefliesTranscript(meetingId);

  if (!transcript) {
    return NextResponse.json({ error: "Failed to fetch transcript" }, { status: 502 });
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

  // Pre-filter: no participants
  if (!hasParticipants(transcript.participants)) {
    return NextResponse.json({ skipped: true, reason: "no_participants" });
  }

  // Chunk the transcript for storage
  const chunks = chunkTranscript(transcript.sentences);
  const chunkedTranscript = chunks.map((c) => c.text).join("\n\n---\n\n");

  // Run through Gatekeeper pipeline (score + extract + novelty check)
  const { result, meetingId: insertedId } = await processMeeting({
    fireflies_id: meetingId,
    title: transcript.title,
    date: transcript.date,
    participants: transcript.participants,
    summary: transcript.summary?.notes ?? "",
    topics: transcript.summary?.topics_discussed ?? [],
    transcript: chunkedTranscript,
  });

  return NextResponse.json({
    success: result.action === "pass",
    meetingId: insertedId,
    action: result.action,
    relevance_score: result.relevance_score,
  });
}

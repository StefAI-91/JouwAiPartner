import { fetchFirefliesTranscript } from "@/lib/fireflies";
import { chunkTranscript } from "@/lib/transcript-processor";
import { getMeetingByFirefliesId } from "@/lib/queries/meetings";
import { isValidDuration, hasParticipants } from "@/lib/validations/fireflies";
import { processMeeting } from "@/lib/services/gatekeeper-pipeline";

export async function processFirefliesWebhook(meetingId: string) {
  const existing = await getMeetingByFirefliesId(meetingId);
  if (existing) {
    return { skipped: true, reason: "duplicate" };
  }

  const transcript = await fetchFirefliesTranscript(meetingId);
  if (!transcript) {
    return { error: "Failed to fetch transcript" };
  }

  const durationCheck = isValidDuration(transcript.sentences);
  if (!durationCheck.valid) {
    return { skipped: true, reason: "too_short", duration: durationCheck.duration };
  }

  if (!hasParticipants(transcript.participants)) {
    return { skipped: true, reason: "no_participants" };
  }

  const chunks = chunkTranscript(transcript.sentences);
  const chunkedTranscript = chunks.map((c) => c.text).join("\n\n---\n\n");

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
    },
  });

  return {
    success: !!pipelineResult.meetingId,
    meetingId: pipelineResult.meetingId,
    meeting_type: pipelineResult.gatekeeper.meeting_type,
    party_type: pipelineResult.gatekeeper.party_type,
    relevance_score: pipelineResult.gatekeeper.relevance_score,
    extractions_saved: pipelineResult.extractions_saved,
    embedded: pipelineResult.embedded,
  };
}

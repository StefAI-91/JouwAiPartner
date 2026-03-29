import { runGatekeeper } from "@/lib/agents/gatekeeper";
import { GatekeeperOutput } from "@/lib/validations/gatekeeper";
import { insertMeeting } from "@/lib/actions/meetings";
import { resolveOrganization } from "@/lib/services/entity-resolution";
import { findPeopleByEmails } from "@/lib/queries/people";
import { linkMeetingParticipants } from "@/lib/actions/meeting-participants";

interface MeetingInput {
  fireflies_id: string;
  title: string;
  date: string;
  participants: string[];
  summary: string;
  topics: string[];
  transcript: string;
}

/**
 * Match participant emails to known people and link them to the meeting.
 * Participants from Fireflies can be emails or names — we match on emails.
 */
async function matchParticipants(meetingId: string, participants: string[]): Promise<number> {
  // Extract email-like strings from participants
  const emails = participants.map((p) => p.toLowerCase().trim()).filter((p) => p.includes("@"));

  if (emails.length === 0) return 0;

  const emailToPersonId = await findPeopleByEmails(emails);
  const personIds = [...emailToPersonId.values()];

  if (personIds.length === 0) return 0;

  const result = await linkMeetingParticipants(meetingId, personIds);
  if ("error" in result) {
    console.error("Failed to link participants:", result.error);
    return 0;
  }
  return result.linked;
}

/**
 * Run a meeting through the Gatekeeper pipeline.
 * All meetings are stored — no rejection. Gatekeeper only classifies.
 */
export async function processMeeting(
  input: MeetingInput,
): Promise<{ result: GatekeeperOutput; meetingId: string | null }> {
  // Step 1: Classify with Gatekeeper
  const result = await runGatekeeper(input.summary, {
    title: input.title,
    participants: input.participants,
    date: input.date,
    topics: input.topics,
  });

  // Step 2: Resolve organization (exact → alias → unmatched)
  const orgResult = await resolveOrganization(result.organization_name);

  // Step 3: Insert meeting (always — no rejection)
  const insertResult = await insertMeeting({
    fireflies_id: input.fireflies_id,
    title: input.title,
    date: new Date(Number(input.date)).toISOString(),
    participants: input.participants,
    summary: input.summary,
    transcript: input.transcript,
    meeting_type: result.meeting_type,
    party_type: result.party_type,
    relevance_score: result.relevance_score,
    organization_id: orgResult.organization_id,
    unmatched_organization_name: orgResult.matched ? null : result.organization_name,
    embedding_stale: true,
  });

  let meetingId: string | null = null;

  if ("error" in insertResult) {
    console.error("Meeting insert error:", insertResult.error);
  } else {
    meetingId = insertResult.data.id;
  }

  // Step 4: Match participants to known people
  if (meetingId) {
    await matchParticipants(meetingId, input.participants);
  }

  return { result, meetingId };
}

import { findPeopleByEmails } from "@repo/database/queries/people";
import { linkMeetingParticipants } from "@repo/database/mutations/meetings/participants";
import type { SpeakerMap } from "../speaker-map";

export interface MeetingAttendee {
  displayName: string;
  email: string;
  name: string;
}

/**
 * Collect all unique participant emails from both the participants array
 * and the structured meeting_attendees (attendees are more reliable).
 */
export function collectParticipantEmails(
  participants: string[],
  attendees?: MeetingAttendee[],
): string[] {
  const emailSet = new Set<string>();

  for (const p of participants) {
    const normalized = p.toLowerCase().trim();
    if (normalized.includes("@")) emailSet.add(normalized);
  }

  if (attendees) {
    for (const a of attendees) {
      if (a.email) emailSet.add(a.email.toLowerCase().trim());
    }
  }

  return [...emailSet];
}

/**
 * Match participant emails and speaker names to known people and link
 * them to the meeting. Uses meeting_attendees emails when available for
 * more reliable matching; also matches speaker names from the speaker map.
 */
export async function matchParticipants(
  meetingId: string,
  participants: string[],
  attendees?: MeetingAttendee[],
  speakerMap?: SpeakerMap,
): Promise<number> {
  const personIdSet = new Set<string>();

  const emails = collectParticipantEmails(participants, attendees);
  if (emails.length > 0) {
    const emailToPersonId = await findPeopleByEmails(emails);
    for (const id of emailToPersonId.values()) personIdSet.add(id);
  }

  if (speakerMap) {
    for (const info of speakerMap.values()) {
      if (info.personId) personIdSet.add(info.personId);
    }
  }

  if (personIdSet.size === 0) return 0;

  const result = await linkMeetingParticipants(meetingId, [...personIdSet]);
  if ("error" in result) {
    console.error("Failed to link participants:", result.error);
    return 0;
  }
  return result.linked;
}

/**
 * Merge participants array with structured meeting_attendees to get a
 * more complete list of participant identifiers for classification.
 * Attendee emails are preferred — the raw participants array is legacy.
 */
export function mergeParticipantSources(
  participants: string[],
  attendees?: MeetingAttendee[],
): string[] {
  const seen = new Set(participants.map((p) => p.toLowerCase().trim()));
  const merged = [...participants];

  if (attendees) {
    for (const a of attendees) {
      const email = a.email?.toLowerCase().trim();
      if (email && !seen.has(email)) {
        merged.push(email);
        seen.add(email);
      }
    }
  }

  return merged;
}

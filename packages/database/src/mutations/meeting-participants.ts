import { getAdminClient } from "../supabase/admin";

/**
 * Link participants (people) to a meeting via the meeting_participants table.
 * Uses ON CONFLICT to be idempotent.
 */
export async function linkMeetingParticipants(
  meetingId: string,
  personIds: string[],
): Promise<{ success: true; linked: number } | { error: string }> {
  if (personIds.length === 0) return { success: true, linked: 0 };

  const rows = personIds.map((personId) => ({
    meeting_id: meetingId,
    person_id: personId,
  }));

  const { error } = await getAdminClient()
    .from("meeting_participants")
    .upsert(rows, { onConflict: "meeting_id,person_id" });

  if (error) return { error: error.message };
  return { success: true, linked: personIds.length };
}

"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { linkMeetingParticipantsSchema } from "@/lib/validations/meeting-participants-action";

export async function linkMeetingParticipants(
  meetingId: string,
  personIds: string[],
): Promise<{ success: true; data: { linked: number } } | { error: string }> {
  const parsed = linkMeetingParticipantsSchema.safeParse({ meetingId, personIds });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (parsed.data.personIds.length === 0) return { success: true, data: { linked: 0 } };

  const rows = parsed.data.personIds.map((personId) => ({
    meeting_id: parsed.data.meetingId,
    person_id: personId,
  }));

  const { error } = await getAdminClient()
    .from("meeting_participants")
    .upsert(rows, { onConflict: "meeting_id,person_id" });

  if (error) return { error: error.message };
  return { success: true, data: { linked: parsed.data.personIds.length } };
}

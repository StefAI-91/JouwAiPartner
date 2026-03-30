import { getAdminClient } from "@/lib/supabase/admin";

export async function getExtractionsByMeetingId(meetingId: string) {
  const { data } = await getAdminClient()
    .from("extractions")
    .select("id, content")
    .eq("meeting_id", meetingId);

  return data ?? [];
}

import { getAdminClient } from "@/lib/supabase/admin";

export interface RecentMeeting {
  id: string;
  title: string | null;
  date: string | null;
  participants: string[] | null;
  relevance_score: number | null;
  meeting_type: string | null;
}

export async function listRecentMeetings(limit: number = 10): Promise<RecentMeeting[]> {
  const { data, error } = await getAdminClient()
    .from("meetings")
    .select("id, title, date, participants, relevance_score, meeting_type")
    .order("date", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !data) return [];
  return data as RecentMeeting[];
}

export async function getMeetingByFirefliesId(firefliesId: string) {
  const { data } = await getAdminClient()
    .from("meetings")
    .select("id")
    .eq("fireflies_id", firefliesId)
    .single();
  return data;
}

export async function getMeetingExtractions(meetingId: string) {
  const { data, error } = await getAdminClient()
    .from("extractions")
    .select("type, content, confidence, transcript_ref")
    .eq("meeting_id", meetingId);

  if (error || !data) return [];
  return data;
}

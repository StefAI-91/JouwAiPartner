import { getAdminClient } from "@/lib/supabase/admin";

export interface RecentMeeting {
  id: string;
  title: string | null;
  date: string | null;
  participants: string[] | null;
  relevance_score: number | null;
  category: string[] | null;
  status: string | null;
}

export async function listRecentMeetings(limit: number = 10): Promise<RecentMeeting[]> {
  const { data, error } = await getAdminClient()
    .from("meetings")
    .select("id, title, date, participants, relevance_score, category, status")
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
  const [decisionsRes, actionItemsRes] = await Promise.all([
    getAdminClient()
      .from("decisions")
      .select("decision, made_by")
      .eq("source_id", meetingId)
      .eq("source_type", "meeting"),
    getAdminClient()
      .from("action_items")
      .select("description, assignee")
      .eq("source_id", meetingId)
      .eq("source_type", "meeting"),
  ]);

  return {
    decisions: decisionsRes.data ?? [],
    actionItems: actionItemsRes.data ?? [],
  };
}

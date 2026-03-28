import { getAdminClient } from "@/lib/supabase/admin";

export async function insertMeeting(meeting: {
  fireflies_id: string;
  title: string;
  date: string;
  participants: string[];
  summary: string;
  action_items: {
    description: string;
    assignee: string;
    deadline: string | null;
    scope: string;
    project: string | null;
  }[];
  transcript: string;
  relevance_score: number;
  status: string;
  category: string[];
  embedding_stale: boolean;
}) {
  return await getAdminClient().from("meetings").insert(meeting).select("id").single();
}

export async function updateMeetingProject(meetingId: string, projectId: string) {
  await getAdminClient().from("meetings").update({ project_id: projectId }).eq("id", meetingId);
}

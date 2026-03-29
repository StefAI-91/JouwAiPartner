"use server";

import { getAdminClient } from "@/lib/supabase/admin";

export async function insertMeeting(meeting: {
  fireflies_id: string;
  title: string;
  date: string;
  participants: string[];
  summary: string;
  transcript: string;
  meeting_type: string;
  party_type: string;
  relevance_score: number;
  organization_id: string | null;
  unmatched_organization_name: string | null;
  embedding_stale: boolean;
}): Promise<{ success: true; data: { id: string } } | { error: string }> {
  const { data, error } = await getAdminClient()
    .from("meetings")
    .insert(meeting)
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { success: true, data };
}

export async function updateMeetingProject(
  meetingId: string,
  projectId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meetings")
    .update({ project_id: projectId })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { insertMeetingSchema, updateMeetingProjectSchema } from "@/lib/validations/meetings-action";

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
  raw_fireflies?: Record<string, unknown> | null;
  embedding_stale: boolean;
}): Promise<{ success: true; data: { id: string } } | { error: string }> {
  const parsed = insertMeetingSchema.safeParse(meeting);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data, error } = await getAdminClient()
    .from("meetings")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { success: true, data };
}

export async function updateMeetingRawFireflies(
  meetingId: string,
  rawFireflies: Record<string, unknown>,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meetings")
    .update({ raw_fireflies: rawFireflies })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateMeetingProject(
  meetingId: string,
  projectId: string,
): Promise<{ success: true } | { error: string }> {
  const parsed = updateMeetingProjectSchema.safeParse({ meetingId, projectId });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await getAdminClient()
    .from("meetings")
    .update({ project_id: parsed.data.projectId })
    .eq("id", parsed.data.meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

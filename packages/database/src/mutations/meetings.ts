import { getAdminClient } from "../supabase/admin";

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
  verification_status?: string;
}): Promise<{ success: true; data: { id: string } } | { error: string }> {
  const { data, error } = await getAdminClient()
    .from("meetings")
    .insert(meeting)
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { success: true, data };
}

export async function updateMeetingClassification(
  meetingId: string,
  data: {
    meeting_type: string;
    party_type: string;
    relevance_score: number;
    organization_id: string | null;
    unmatched_organization_name: string | null;
    raw_fireflies: Record<string, unknown>;
  },
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meetings")
    .update(data)
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateMeetingElevenLabs(
  meetingId: string,
  data: {
    transcript_elevenlabs: string;
    raw_elevenlabs: Record<string, unknown>;
    audio_url?: string;
  },
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meetings")
    .update(data)
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
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

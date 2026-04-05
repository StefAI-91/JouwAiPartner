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
    .upsert(meeting, { onConflict: "fireflies_id", ignoreDuplicates: true })
    .select("id")
    .single();

  if (error) {
    // Catch unique constraint violation from title+date index
    if (error.code === "23505") {
      return { error: `duplicate_meeting: meeting with title "${meeting.title}" already exists for this date` };
    }
    return { error: error.message };
  }
  return { success: true, data };
}

/**
 * Insert a manually logged meeting (phone call, email, chat — no Fireflies ID).
 * Always creates a new record (plain insert, no upsert).
 */
export async function insertManualMeeting(meeting: {
  title: string;
  date: string;
  summary: string;
  meeting_type: string;
  party_type: string;
  organization_id: string | null;
  participants?: string[];
}): Promise<{ success: true; data: { id: string } } | { error: string }> {
  const { data, error } = await getAdminClient()
    .from("meetings")
    .insert({
      ...meeting,
      participants: meeting.participants ?? [],
      relevance_score: 1.0,
      embedding_stale: true,
      verification_status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: `Er bestaat al een meeting met titel "${meeting.title}" op deze datum` };
    }
    return { error: error.message };
  }
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

export async function updateMeetingType(
  meetingId: string,
  meetingType: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meetings")
    .update({ meeting_type: meetingType })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateMeetingTitle(
  meetingId: string,
  title: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meetings")
    .update({ title })
    .eq("id", meetingId);

  if (error) {
    if (error.code === "23505") {
      return { error: "Er bestaat al een meeting met deze titel op dezelfde dag" };
    }
    return { error: error.message };
  }
  return { success: true };
}

export async function updateMeetingOrganization(
  meetingId: string,
  organizationId: string | null,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meetings")
    .update({ organization_id: organizationId })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function linkMeetingProject(
  meetingId: string,
  projectId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meeting_projects")
    .upsert(
      { meeting_id: meetingId, project_id: projectId },
      { onConflict: "meeting_id,project_id" },
    );

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateMeetingSummary(
  meetingId: string,
  summary: string,
  aiBriefing: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meetings")
    .update({ summary, ai_briefing: aiBriefing })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateMeetingSummaryOnly(
  meetingId: string,
  summary: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meetings")
    .update({ summary })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
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

export async function markMeetingEmbeddingStale(
  meetingId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meetings")
    .update({ embedding_stale: true })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function unlinkMeetingProject(
  meetingId: string,
  projectId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meeting_projects")
    .delete()
    .eq("meeting_id", meetingId)
    .eq("project_id", projectId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteMeeting(
  meetingId: string,
): Promise<{ success: true } | { error: string }> {
  // CASCADE handles extractions, meeting_projects, meeting_participants
  const { error } = await getAdminClient()
    .from("meetings")
    .delete()
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

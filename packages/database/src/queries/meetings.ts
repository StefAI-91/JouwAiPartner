import { getAdminClient } from "../supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface MeetingDetail {
  id: string;
  title: string | null;
  date: string | null;
  meeting_type: string | null;
  party_type: string | null;
  transcript: string | null;
  summary: string | null;
  verification_status: string;
  verified_at: string | null;
  verifier: { full_name: string | null } | null;
  organization: { name: string } | null;
  meeting_participants: { person: { id: string; name: string } }[];
  extractions: {
    id: string;
    type: string;
    content: string;
    confidence: number | null;
    transcript_ref: string | null;
  }[];
}

export async function getVerifiedMeetingById(
  meetingId: string,
  client?: SupabaseClient,
): Promise<MeetingDetail | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meetings")
    .select(
      `id, title, date, meeting_type, party_type, transcript, summary,
       verification_status, verified_at,
       verifier:profiles!meetings_verified_by_fkey(full_name),
       organization:organizations(name),
       meeting_participants(person:people(id, name)),
       extractions(id, type, content, confidence, transcript_ref)`,
    )
    .eq("id", meetingId)
    .eq("verification_status", "verified")
    .single();

  if (error) {
    console.error("[getVerifiedMeetingById]", error.message);
    return null;
  }
  return data as unknown as MeetingDetail;
}

export interface RecentMeeting {
  id: string;
  title: string | null;
  date: string | null;
  participants: string[] | null;
  relevance_score: number | null;
  meeting_type: string | null;
  verification_status: string | null;
}

export async function listRecentMeetings(
  limit: number = 10,
  client?: SupabaseClient,
): Promise<RecentMeeting[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meetings")
    .select("id, title, date, participants, relevance_score, meeting_type, verification_status")
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

/**
 * Check if a meeting with the same title and date already exists.
 * Fireflies creates separate transcripts per team member for the same meeting,
 * each with a unique fireflies_id. This catches those duplicates.
 */
export async function getMeetingByTitleAndDate(title: string, date: string) {
  const { data } = await getAdminClient()
    .from("meetings")
    .select("id, fireflies_id")
    .eq("title", title)
    .eq("date", date)
    .limit(1)
    .maybeSingle();
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

/**
 * Batch fetch extractions for multiple meetings at once (avoids N+1).
 * Returns a Map of meetingId -> extractions.
 */
export async function getMeetingExtractionsBatch(
  meetingIds: string[],
): Promise<Map<string, { type: string; content: string }[]>> {
  const result = new Map<string, { type: string; content: string }[]>();
  if (meetingIds.length === 0) return result;

  const { data, error } = await getAdminClient()
    .from("extractions")
    .select("meeting_id, type, content")
    .in("meeting_id", meetingIds);

  if (error || !data) return result;

  for (const row of data) {
    const existing = result.get(row.meeting_id) ?? [];
    existing.push({ type: row.type, content: row.content });
    result.set(row.meeting_id, existing);
  }

  return result;
}

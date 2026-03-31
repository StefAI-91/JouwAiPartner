import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export interface ReviewMeeting {
  id: string;
  title: string | null;
  date: string | null;
  meeting_type: string | null;
  party_type: string | null;
  created_at: string;
  organization: { name: string } | null;
  meeting_participants: { person: { id: string; name: string } }[];
  extractions: { id: string; type: string; content: string; confidence: number | null }[];
}

export async function listDraftMeetings(client?: SupabaseClient): Promise<ReviewMeeting[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meetings")
    .select(
      `id, title, date, meeting_type, party_type, created_at,
       organization:organizations(name),
       meeting_participants(person:people(id, name)),
       extractions(id, type, content, confidence)`,
    )
    .eq("verification_status", "draft")
    .order("date", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("[listDraftMeetings]", error.message);
    return [];
  }
  return (data ?? []) as unknown as ReviewMeeting[];
}

export interface ReviewMeetingDetail {
  id: string;
  title: string | null;
  date: string | null;
  meeting_type: string | null;
  party_type: string | null;
  transcript: string | null;
  summary: string | null;
  organization: { name: string } | null;
  meeting_participants: { person: { id: string; name: string } }[];
  extractions: {
    id: string;
    type: string;
    content: string;
    confidence: number | null;
    transcript_ref: string | null;
    metadata: Record<string, unknown>;
  }[];
}

export async function getDraftMeetingById(
  meetingId: string,
  client?: SupabaseClient,
): Promise<ReviewMeetingDetail | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meetings")
    .select(
      `id, title, date, meeting_type, party_type, transcript, summary,
       organization:organizations(name),
       meeting_participants(person:people(id, name)),
       extractions(id, type, content, confidence, transcript_ref, metadata)`,
    )
    .eq("id", meetingId)
    .eq("verification_status", "draft")
    .single();

  if (error) {
    console.error("[getDraftMeetingById]", error.message);
    return null;
  }
  return data as unknown as ReviewMeetingDetail;
}

export async function getReviewStats(
  client?: SupabaseClient,
): Promise<{ verifiedToday: number; totalVerified: number }> {
  const db = client ?? getAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const [todayResult, totalResult] = await Promise.all([
    db
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "verified")
      .gte("verified_at", today),
    db
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "verified"),
  ]);

  return {
    verifiedToday: todayResult.count ?? 0,
    totalVerified: totalResult.count ?? 0,
  };
}

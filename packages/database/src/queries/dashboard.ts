import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

/**
 * Count meetings awaiting review (verification_status = 'draft').
 */
export async function getReviewQueueCount(client?: SupabaseClient): Promise<number> {
  const db = client ?? getAdminClient();
  const { count, error } = await db
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .eq("verification_status", "draft");

  if (error) {
    console.error("[getReviewQueueCount]", error.message);
    return 0;
  }
  return count ?? 0;
}

export interface RecentVerifiedMeeting {
  id: string;
  title: string | null;
  date: string | null;
  verified_at: string | null;
  organization: { name: string } | null;
}

/**
 * List recently verified meetings, ordered by verified_at desc.
 */
export async function listRecentVerifiedMeetings(
  limit: number = 5,
  client?: SupabaseClient,
): Promise<RecentVerifiedMeeting[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meetings")
    .select(
      `id, title, date, verified_at,
       organization:organizations(name)`,
    )
    .eq("verification_status", "verified")
    .order("verified_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as RecentVerifiedMeeting[];
}

export interface BriefingMeeting {
  id: string;
  title: string | null;
  date: string | null;
  ai_briefing: string;
  meeting_type: string | null;
  party_type: string | null;
  organization: { name: string } | null;
}

/**
 * List verified meetings with AI briefings for the dashboard carousel.
 */
export async function listBriefingMeetings(
  limit: number = 8,
  client?: SupabaseClient,
): Promise<BriefingMeeting[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meetings")
    .select(
      `id, title, date, ai_briefing, meeting_type, party_type,
       organization:organizations(name)`,
    )
    .eq("verification_status", "verified")
    .not("ai_briefing", "is", null)
    .order("date", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as BriefingMeeting[];
}

export interface ExtractionCounts {
  decision: number;
  action_item: number;
  need: number;
  insight: number;
}

/**
 * Get extraction counts for a set of meeting IDs (batch, avoids N+1).
 */
export async function getExtractionCountsByMeetingIds(
  meetingIds: string[],
  client?: SupabaseClient,
): Promise<Record<string, ExtractionCounts>> {
  if (meetingIds.length === 0) return {};
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("extractions")
    .select("meeting_id, type")
    .in("meeting_id", meetingIds);

  if (error || !data) return {};

  const counts: Record<string, ExtractionCounts> = {};
  for (const row of data) {
    const mid = row.meeting_id as string;
    if (!counts[mid]) counts[mid] = { decision: 0, action_item: 0, need: 0, insight: 0 };
    const t = row.type as keyof ExtractionCounts;
    if (t in counts[mid]) counts[mid][t]++;
  }
  return counts;
}

export interface AiPulseData {
  totalProcessed: number;
  recentDecisions: number;
  upcomingDeadlines: number;
  openNeeds: number;
}

/**
 * Get AI pulse data for the dashboard strip.
 */
export async function getAiPulseData(client?: SupabaseClient): Promise<AiPulseData> {
  const db = client ?? getAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const [processedRes, decisionsRes, deadlinesRes, needsRes] = await Promise.all([
    db
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "verified")
      .gte("created_at", sevenDaysAgo),
    db
      .from("extractions")
      .select("id", { count: "exact", head: true })
      .eq("type", "decision")
      .gte("created_at", sevenDaysAgo),
    db
      .from("extractions")
      .select("id", { count: "exact", head: true })
      .eq("type", "action_item")
      .not("metadata->deadline", "is", null)
      .gte("metadata->deadline", now)
      .lte("metadata->deadline", sevenDaysFromNow),
    db.from("extractions").select("id", { count: "exact", head: true }).eq("type", "need"),
  ]);

  return {
    totalProcessed: processedRes.count ?? 0,
    recentDecisions: decisionsRes.count ?? 0,
    upcomingDeadlines: deadlinesRes.count ?? 0,
    openNeeds: needsRes.count ?? 0,
  };
}

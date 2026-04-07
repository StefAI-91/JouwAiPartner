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

export interface TodaysBriefingResult {
  meetings: BriefingMeeting[];
  /** The label for the day shown: "Vandaag", "Gisteren", or a formatted date */
  dayLabel: string;
}

/**
 * List briefing meetings for today, falling back to yesterday, then the day before.
 * Returns the most recent day (within 3 days) that has meetings.
 */
export async function listTodaysBriefingMeetings(
  client?: SupabaseClient,
): Promise<TodaysBriefingResult> {
  const db = client ?? getAdminClient();
  const today = new Date();
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 2);

  const todayStr = today.toISOString().split("T")[0];
  const threeDaysAgoStr = threeDaysAgo.toISOString().split("T")[0];

  const { data, error } = await db
    .from("meetings")
    .select(
      `id, title, date, ai_briefing, meeting_type, party_type,
       organization:organizations(name)`,
    )
    .eq("verification_status", "verified")
    .not("ai_briefing", "is", null)
    .gte("date", threeDaysAgoStr)
    .lt("date", todayStr + "T23:59:59.999Z")
    .order("date", { ascending: false, nullsFirst: false })
    .limit(50);

  if (error || !data || data.length === 0) {
    return { meetings: [], dayLabel: "Vandaag" };
  }

  const meetings = data as unknown as BriefingMeeting[];

  // Pick the most recent day that has meetings (compare date portion only)
  const mostRecentDay = meetings[0].date?.slice(0, 10);
  if (!mostRecentDay) {
    return { meetings: [], dayLabel: "Vandaag" };
  }
  const filtered = meetings.filter((m) => m.date?.slice(0, 10) === mostRecentDay);

  const dayLabel = getDayLabel(mostRecentDay, todayStr);

  return { meetings: filtered, dayLabel };
}

function getDayLabel(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return "Vandaag";

  const today = new Date(todayStr);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === yesterday.toISOString().split("T")[0]) return "Gisteren";

  // Format as readable date
  const d = new Date(dateStr);
  return d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
}

export interface ExtractionCounts {
  action_item: number;
}

/**
 * Get action item counts for a set of meeting IDs (batch, avoids N+1).
 */
export async function getExtractionCountsByMeetingIds(
  meetingIds: string[],
  client?: SupabaseClient,
): Promise<Record<string, ExtractionCounts>> {
  if (meetingIds.length === 0) return {};
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("extractions")
    .select("meeting_id")
    .eq("type", "action_item")
    .in("meeting_id", meetingIds);

  if (error || !data) return {};

  const counts: Record<string, ExtractionCounts> = {};
  for (const row of data) {
    const mid = row.meeting_id as string;
    if (!counts[mid]) counts[mid] = { action_item: 0 };
    counts[mid].action_item++;
  }
  return counts;
}

export interface AiPulseData {
  totalProcessed: number;
  activeActions: number;
  upcomingDeadlines: number;
}

/**
 * Get AI pulse data for the dashboard strip.
 */
export async function getAiPulseData(client?: SupabaseClient): Promise<AiPulseData> {
  const db = client ?? getAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const [processedRes, actionsRes, deadlinesRes] = await Promise.all([
    db
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "verified")
      .gte("created_at", sevenDaysAgo),
    db
      .from("extractions")
      .select("id", { count: "exact", head: true })
      .eq("type", "action_item")
      .eq("verification_status", "verified"),
    db
      .from("extractions")
      .select("id", { count: "exact", head: true })
      .eq("type", "action_item")
      .not("metadata->deadline", "is", null)
      .gte("metadata->deadline", now)
      .lte("metadata->deadline", sevenDaysFromNow),
  ]);

  return {
    totalProcessed: processedRes.count ?? 0,
    activeActions: actionsRes.count ?? 0,
    upcomingDeadlines: deadlinesRes.count ?? 0,
  };
}

import { getAdminClient } from "../supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface RecentDecision {
  id: string;
  decision: string;
  made_by: string | null;
  date: string | null;
  status: string | null;
  meeting_title: string | null;
}

export async function listRecentDecisions(
  limit: number = 10,
  client?: SupabaseClient,
): Promise<RecentDecision[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("decisions")
    .select("id, decision, made_by, date, status, source_id, source_type")
    .order("date", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !data) return [];

  // Batch-fetch meeting titles to avoid N+1
  const meetingIds = data.filter((d) => d.source_type === "meeting").map((d) => d.source_id);

  let meetingMap: Record<string, string> = {};
  if (meetingIds.length > 0) {
    const { data: meetings } = await db.from("meetings").select("id, title").in("id", meetingIds);
    if (meetings) {
      meetingMap = Object.fromEntries(meetings.map((m) => [m.id, m.title ?? ""]));
    }
  }

  return data.map((d) => ({
    id: d.id,
    decision: d.decision,
    made_by: d.made_by,
    date: d.date,
    status: d.status,
    meeting_title: d.source_type === "meeting" ? (meetingMap[d.source_id] ?? null) : null,
  }));
}

export async function matchDecisions(
  embedding: number[],
  threshold: number = 0.8,
  count: number = 5,
) {
  const { data, error } = await getAdminClient().rpc("match_decisions", {
    query_embedding: embedding as number[] & { readonly brand: unique symbol }, // TODO: type this — Supabase RPC vector param
    match_threshold: threshold,
    match_count: count,
  });
  if (error || !data) return [];
  return data as {
    id: string;
    decision: string;
    source_id: string;
    made_by: string;
    date: string;
    similarity: number;
  }[];
}

export async function matchMeetings(
  embedding: number[],
  threshold: number = 0.8,
  count: number = 5,
) {
  const { data, error } = await getAdminClient().rpc("match_meetings", {
    query_embedding: embedding as number[] & { readonly brand: unique symbol }, // TODO: type this — Supabase RPC vector param
    match_threshold: threshold,
    match_count: count,
  });
  if (error || !data) return [];
  return data as {
    id: string;
    title: string;
    summary: string;
    date: string;
    similarity: number;
  }[];
}

export async function getMeetingTitle(meetingId: string) {
  const { data } = await getAdminClient()
    .from("meetings")
    .select("title, date")
    .eq("id", meetingId)
    .single();
  return data;
}

import { getAdminClient } from "../supabase/admin";

export interface RecentDecision {
  id: string;
  decision: string;
  made_by: string | null;
  date: string | null;
  status: string | null;
  meeting_title: string | null;
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


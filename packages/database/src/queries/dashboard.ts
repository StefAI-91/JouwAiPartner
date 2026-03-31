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

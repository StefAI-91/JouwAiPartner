"use server";

import { getAdminClient } from "@/lib/supabase/admin";

export async function insertPendingMatch(match: {
  content_id: string;
  content_table: string;
  extracted_name: string;
  suggested_match_id: string | null;
  similarity_score: number | null;
  status: string;
}): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient().from("pending_matches").insert(match);

  if (error) return { error: error.message };
  return { success: true };
}

import { getAdminClient } from "@/lib/supabase/admin";

export async function getPendingMatches() {
  const { data, error } = await getAdminClient()
    .from("pending_matches")
    .select(
      "id, content_id, content_table, extracted_name, suggested_match_id, similarity_score, created_at",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data;
}

import { getAdminClient } from "@/lib/supabase/admin";

export async function insertPendingMatch(match: {
  content_id: string;
  content_table: string;
  extracted_name: string;
  suggested_match_id: string | null;
  similarity_score: number | null;
  status: string;
}) {
  await getAdminClient().from("pending_matches").insert(match);
}

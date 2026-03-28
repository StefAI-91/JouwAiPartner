import { getAdminClient } from "@/lib/supabase/admin";

export async function insertContentReview(review: {
  content_id: string;
  content_table: string;
  agent_role: string;
  action: string;
  reason: string;
  metadata: Record<string, unknown>;
}) {
  await getAdminClient().from("content_reviews").insert(review);
}

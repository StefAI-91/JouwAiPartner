import { getAdminClient } from "@/lib/supabase/admin";

export async function insertDecision(decision: {
  decision: string;
  context: string | null;
  made_by: string;
  source_type: string;
  source_id: string;
  project_id: string | null;
  date: string;
  status: string;
  embedding_stale: boolean;
}) {
  await getAdminClient().from("decisions").insert(decision);
}

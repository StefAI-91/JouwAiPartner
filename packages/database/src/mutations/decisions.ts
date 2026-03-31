import { getAdminClient } from "../supabase/admin";

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
}): Promise<{ success: true; id: string } | { error: string }> {
  const { data, error } = await getAdminClient()
    .from("decisions")
    .insert(decision)
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { success: true, id: data.id };
}

"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { insertDecisionSchema } from "@/lib/validations/decisions-action";

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
}): Promise<{ success: true; data: { id: string } } | { error: string }> {
  const parsed = insertDecisionSchema.safeParse(decision);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data, error } = await getAdminClient()
    .from("decisions")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { success: true, data: { id: data.id } };
}

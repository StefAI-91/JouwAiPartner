import { getAdminClient } from "../../supabase/admin";

export async function insertEmailExtractions(
  rows: {
    email_id: string;
    type: string;
    content: string;
    confidence: number;
    source_ref: string | null;
    metadata: Record<string, unknown>;
    project_id: string | null;
    embedding_stale: boolean;
    verification_status: string;
  }[],
): Promise<{ success: true; count: number } | { error: string }> {
  if (rows.length === 0) return { success: true, count: 0 };

  const { error } = await getAdminClient().from("email_extractions").insert(rows);

  if (error) return { error: error.message };
  return { success: true, count: rows.length };
}

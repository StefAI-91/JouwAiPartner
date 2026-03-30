"use server";

import { getAdminClient } from "@/lib/supabase/admin";

export async function insertExtractions(
  rows: {
    meeting_id: string;
    type: string;
    content: string;
    confidence: number;
    transcript_ref: string | null;
    metadata: Record<string, unknown>;
    project_id: string | null;
    embedding_stale: boolean;
  }[],
): Promise<{ success: true } | { error: string }> {
  if (rows.length === 0) return { success: true };

  const { error } = await getAdminClient().from("extractions").insert(rows);

  if (error) return { error: error.message };
  return { success: true };
}

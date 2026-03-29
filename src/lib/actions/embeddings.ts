"use server";

import { getAdminClient } from "@/lib/supabase/admin";

export async function updateRowEmbedding(
  table: string,
  id: string,
  embedding: number[],
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from(table)
    .update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase vector type mismatch
      embedding: embedding as any,
      embedding_stale: false,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

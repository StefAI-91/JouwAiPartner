"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { updateRowEmbeddingSchema } from "@/lib/validations/embeddings-action";

export async function updateRowEmbedding(
  table: string,
  id: string,
  embedding: number[],
): Promise<{ success: true } | { error: string }> {
  const parsed = updateRowEmbeddingSchema.safeParse({ table, id, embedding });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await getAdminClient()
    .from(parsed.data.table)
    .update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase vector type mismatch
      embedding: parsed.data.embedding as any,
      embedding_stale: false,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };
  return { success: true };
}

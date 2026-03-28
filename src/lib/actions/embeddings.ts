import { getAdminClient } from "@/lib/supabase/admin";

export async function updateRowEmbedding(table: string, id: string, embedding: number[]) {
  await getAdminClient()
    .from(table)
    .update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      embedding: embedding as any,
      embedding_stale: false,
    })
    .eq("id", id);
}

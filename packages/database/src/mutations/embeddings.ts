import { getAdminClient } from "../supabase/admin";

const EMBEDDABLE_TABLES = ["meetings", "extractions", "projects", "people"] as const;
type EmbeddableTable = (typeof EMBEDDABLE_TABLES)[number];

export async function updateRowEmbedding(
  table: EmbeddableTable,
  id: string,
  embedding: number[],
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from(table)
    .update({
      // Supabase JS client doesn't have a native vector type — cast via RPC or pass as-is.
      // The PostgREST layer accepts number[] for vector columns.
      embedding: embedding as unknown as string,
      embedding_stale: false,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Batch update embeddings for multiple rows in a single RPC call.
 * Avoids N+1 individual UPDATE queries.
 */
export async function batchUpdateEmbeddings(
  table: EmbeddableTable,
  ids: string[],
  embeddings: number[][],
): Promise<{ success: true } | { error: string }> {
  if (ids.length === 0) return { success: true };
  if (ids.length !== embeddings.length) {
    return { error: "ids and embeddings arrays must have the same length" };
  }

  const { error } = await getAdminClient().rpc("batch_update_embeddings", {
    p_table: table,
    p_ids: ids,
    p_embeddings: embeddings,
  });

  if (error) return { error: error.message };
  return { success: true };
}

import { getAdminClient } from "@/lib/supabase/admin";

export async function searchAllContent(embedding: number[], threshold: number, count: number) {
  const { data, error } = await getAdminClient().rpc("search_all_content", {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query_embedding: embedding as any,
    match_threshold: threshold,
    match_count: count,
  });
  if (error || !data) return [];
  return data;
}

export async function getStaleRows(table: string, limit: number = 50) {
  const { data, error } = await getAdminClient()
    .from(table)
    .select("*")
    .or("embedding_stale.eq.true,embedding.is.null")
    .limit(limit);
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as Record<string, any>[];
}

import { getAdminClient } from "@/lib/supabase/admin";

export async function searchAllContent(
  embedding: number[],
  threshold: number,
  count: number,
  queryText = "",
) {
  const { data, error } = await getAdminClient().rpc("search_all_content", {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query_embedding: embedding as any,
    query_text: queryText,
    match_threshold: threshold,
    match_count: count,
  });
  if (error || !data) return [];
  return data;
}

const STALE_ROW_COLUMNS: Record<string, string> = {
  meetings: "id, title, participants, summary, embedding_stale",
  extractions: "id, content, type, embedding_stale",
  projects: "id, name, embedding_stale",
};

export interface StaleRow {
  id: string;
  title?: string;
  participants?: string[];
  summary?: string;
  content?: string;
  type?: string;
  name?: string;
  embedding_stale?: boolean;
}

export async function getStaleRows(table: string, limit: number = 50): Promise<StaleRow[]> {
  const columns = STALE_ROW_COLUMNS[table] ?? "id, embedding_stale";
  const { data, error } = await getAdminClient()
    .from(table)
    .select(columns)
    .or("embedding_stale.eq.true,embedding.is.null")
    .limit(limit);
  if (error || !data) return [];
  return data as unknown as StaleRow[];
}

import { getAdminClient } from "../../supabase/admin";

export async function matchProjectsByEmbedding(
  embedding: number[],
  threshold: number = 0.85,
  count: number = 3,
) {
  const { data, error } = await getAdminClient().rpc("match_projects", {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: count,
  });
  if (error) return null;
  return data;
}

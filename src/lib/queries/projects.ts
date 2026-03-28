import { getAdminClient } from "@/lib/supabase/admin";

export async function getProjectByNameIlike(name: string) {
  const { data } = await getAdminClient()
    .from("projects")
    .select("id, name, aliases")
    .ilike("name", `%${name}%`)
    .limit(1)
    .single();
  return data;
}

export async function getAllProjects() {
  const { data } = await getAdminClient().from("projects").select("id, name, aliases");
  return data;
}

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

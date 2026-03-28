import { getAdminClient } from "@/lib/supabase/admin";

export async function getStalePeople(limit: number = 50) {
  const { data, error } = await getAdminClient()
    .from("people")
    .select("id, name, team, role")
    .eq("embedding_stale", true)
    .limit(limit);
  if (error || !data) return [];
  return data;
}

export async function getPersonSkills(personId: string) {
  const { data } = await getAdminClient()
    .from("people_skills")
    .select("skill, evidence_count")
    .eq("person_id", personId);
  return data || [];
}

export async function getPersonProjects(personId: string) {
  const { data } = await getAdminClient()
    .from("people_projects")
    .select("project, role_in_project")
    .eq("person_id", personId);
  return data || [];
}

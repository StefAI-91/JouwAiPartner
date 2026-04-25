import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

export interface PersonDetail {
  id: string;
  name: string;
  email: string | null;
  team: string | null;
  role: string | null;
  organization_id: string | null;
  organization: { name: string } | null;
  meeting_count: number;
}

export async function getPersonById(
  personId: string,
  client?: SupabaseClient,
): Promise<PersonDetail | null> {
  const db = client ?? getAdminClient();

  const { data: person, error } = await db
    .from("people")
    .select("id, name, email, team, role, organization_id, organization:organizations(name)")
    .eq("id", personId)
    .single();

  if (error || !person) return null;

  const { count } = await db
    .from("meeting_participants")
    .select("meeting_id", { count: "exact", head: true })
    .eq("person_id", personId);

  return {
    ...(person as unknown as Omit<PersonDetail, "meeting_count">),
    meeting_count: count ?? 0,
  };
}

export async function getStalePeople(limit: number = 50) {
  const { data, error } = await getAdminClient()
    .from("people")
    .select("id, name, team, role")
    .eq("embedding_stale", true)
    .limit(limit);
  if (error || !data) return [];
  return data;
}

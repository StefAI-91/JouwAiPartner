import { getAdminClient } from "../supabase/admin";

export async function getAllOrganizations() {
  const { data, error } = await getAdminClient().from("organizations").select("id, name, aliases");

  if (error || !data) return [];
  return data;
}

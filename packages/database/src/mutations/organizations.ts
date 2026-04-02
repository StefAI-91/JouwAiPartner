import { getAdminClient } from "../supabase/admin";

export async function createOrganization(data: {
  name: string;
  type?: string;
}): Promise<{ success: true; data: { id: string; name: string } } | { error: string }> {
  const { data: org, error } = await getAdminClient()
    .from("organizations")
    .insert({
      name: data.name,
      type: data.type ?? "client",
      status: "active",
    })
    .select("id, name")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: `Er bestaat al een organisatie met de naam "${data.name}"` };
    }
    return { error: error.message };
  }
  return { success: true, data: org };
}

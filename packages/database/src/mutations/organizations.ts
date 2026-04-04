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

export async function updateOrganization(
  orgId: string,
  data: {
    name?: string;
    type?: string;
    status?: string;
    contact_person?: string | null;
    email?: string | null;
  },
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("organizations")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", orgId);

  if (error) {
    if (error.code === "23505") {
      return { error: `Er bestaat al een organisatie met deze naam` };
    }
    return { error: error.message };
  }
  return { success: true };
}

export async function deleteOrganization(
  orgId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("organizations")
    .delete()
    .eq("id", orgId);

  if (error) return { error: error.message };
  return { success: true };
}

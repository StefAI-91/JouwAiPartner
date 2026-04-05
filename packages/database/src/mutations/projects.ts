import { getAdminClient } from "../supabase/admin";

export async function createProject(data: {
  name: string;
  organizationId?: string | null;
}): Promise<{ success: true; data: { id: string; name: string } } | { error: string }> {
  const { data: project, error } = await getAdminClient()
    .from("projects")
    .insert({
      name: data.name,
      organization_id: data.organizationId ?? null,
      status: "active",
    })
    .select("id, name")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: `Er bestaat al een project met de naam "${data.name}"` };
    }
    return { error: error.message };
  }
  return { success: true, data: project };
}

export async function updateProjectAliases(
  projectId: string,
  aliases: string[],
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("projects")
    .update({
      aliases,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateProject(
  projectId: string,
  data: {
    name?: string;
    status?: string;
    organization_id?: string | null;
    description?: string | null;
    owner_id?: string | null;
    contact_person_id?: string | null;
    start_date?: string | null;
    deadline?: string | null;
  },
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("projects")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", projectId);

  if (error) {
    if (error.code === "23505") {
      return { error: `Er bestaat al een project met deze naam` };
    }
    return { error: error.message };
  }
  return { success: true };
}

export async function deleteProject(
  projectId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient().from("projects").delete().eq("id", projectId);

  if (error) return { error: error.message };
  return { success: true };
}

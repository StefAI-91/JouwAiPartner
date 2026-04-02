import { getAdminClient } from "../supabase/admin";

export async function createPerson(data: {
  name: string;
  email?: string | null;
  role?: string | null;
  organizationId?: string | null;
}): Promise<{ success: true; data: { id: string; name: string } } | { error: string }> {
  const { data: person, error } = await getAdminClient()
    .from("people")
    .insert({
      name: data.name,
      email: data.email ?? null,
      role: data.role ?? null,
      organization_id: data.organizationId ?? null,
      embedding_stale: true,
    })
    .select("id, name")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: `Er bestaat al een persoon met dit e-mailadres` };
    }
    return { error: error.message };
  }
  return { success: true, data: person };
}

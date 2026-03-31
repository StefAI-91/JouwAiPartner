import { getAdminClient } from "../supabase/admin";

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

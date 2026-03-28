import { getAdminClient } from "@/lib/supabase/admin";

export async function updateProjectAliases(projectId: string, aliases: string[]) {
  await getAdminClient()
    .from("projects")
    .update({
      aliases,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);
}

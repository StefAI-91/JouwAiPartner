"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { updateProjectAliasesSchema } from "@/lib/validations/projects-action";

export async function updateProjectAliases(
  projectId: string,
  aliases: string[],
): Promise<{ success: true } | { error: string }> {
  const parsed = updateProjectAliasesSchema.safeParse({ projectId, aliases });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await getAdminClient()
    .from("projects")
    .update({
      aliases: parsed.data.aliases,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.projectId);

  if (error) return { error: error.message };
  return { success: true };
}

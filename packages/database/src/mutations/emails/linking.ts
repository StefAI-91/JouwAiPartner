import { getAdminClient } from "../../supabase/admin";

export async function linkEmailProject(
  emailId: string,
  projectId: string,
  source: "ai" | "manual" | "review" = "ai",
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("email_projects")
    .upsert(
      { email_id: emailId, project_id: projectId, source },
      { onConflict: "email_id,project_id" },
    );

  if (error) return { error: error.message };
  return { success: true };
}

export async function unlinkEmailProject(
  emailId: string,
  projectId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("email_projects")
    .delete()
    .eq("email_id", emailId)
    .eq("project_id", projectId);

  if (error) return { error: error.message };
  return { success: true };
}

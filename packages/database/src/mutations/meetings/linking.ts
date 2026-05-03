import { getAdminClient } from "../../supabase/admin";

export async function linkMeetingProject(
  meetingId: string,
  projectId: string,
  source: "ai" | "manual" | "review" = "ai",
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meeting_projects")
    .upsert(
      { meeting_id: meetingId, project_id: projectId, source },
      { onConflict: "meeting_id,project_id" },
    );

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Link all identified projects to a meeting with source='ai'.
 * Only links projects that have a resolved project_id.
 * Uses a single batch upsert instead of individual queries (N+1 fix).
 */
export async function linkAllMeetingProjects(
  meetingId: string,
  identifiedProjects: { project_id: string | null }[],
): Promise<{ linked: number; errors: string[] }> {
  const projectsWithId = identifiedProjects.filter(
    (p): p is { project_id: string } => p.project_id !== null,
  );

  if (projectsWithId.length === 0) return { linked: 0, errors: [] };

  const rows = projectsWithId.map((p) => ({
    meeting_id: meetingId,
    project_id: p.project_id,
    source: "ai" as const,
  }));

  const { error } = await getAdminClient()
    .from("meeting_projects")
    .upsert(rows, { onConflict: "meeting_id,project_id" });

  if (error) return { linked: 0, errors: [error.message] };
  return { linked: rows.length, errors: [] };
}

export async function unlinkMeetingProject(
  meetingId: string,
  projectId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meeting_projects")
    .delete()
    .eq("meeting_id", meetingId)
    .eq("project_id", projectId);

  if (error) return { error: error.message };
  return { success: true };
}

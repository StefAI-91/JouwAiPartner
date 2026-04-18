import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";
import { getProjectById, type ProjectDetail } from "./projects";
import { getSegmentsByProjectId, type ProjectSegment } from "./meeting-project-summaries";

export interface WorkspaceActionItem {
  id: string;
  content: string;
  follow_up_contact: string | null;
  assignee: string | null;
  deadline: string | null;
  suggested_deadline: string | null;
  source_meeting: { id: string; title: string | null } | null;
}

export interface ProjectWorkspaceData {
  project: ProjectDetail;
  segments: ProjectSegment[];
  waitingOnClient: WorkspaceActionItem[];
  upcomingMeetings: { id: string; title: string | null; date: string }[];
}

/**
 * Single entrypoint for /projects/[id] workspace. Loads all panel-data in
 * parallel so the page composes from one await instead of five.
 *
 * Markdown-parsing of `segments[].kernpunten` happens in the page layer to
 * keep this package free of `@repo/ai` dependencies.
 */
export async function getProjectWorkspaceData(
  projectId: string,
  client?: SupabaseClient,
): Promise<ProjectWorkspaceData | null> {
  const db = client ?? getAdminClient();
  const todayIso = new Date().toISOString();

  const [project, segments, waitingResult, upcomingResult] = await Promise.all([
    getProjectById(projectId, db),
    getSegmentsByProjectId(projectId, db),
    db
      .from("extractions")
      .select(
        `id, content, metadata,
         meeting:meetings(id, title)`,
      )
      .eq("project_id", projectId)
      .eq("type", "action_item")
      .eq("verification_status", "verified")
      .eq("metadata->>category", "wachten_op_extern")
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("meeting_projects")
      .select("meeting:meetings(id, title, date)")
      .eq("project_id", projectId),
  ]);

  if (!project) return null;

  const waitingOnClient: WorkspaceActionItem[] = (waitingResult.data ?? []).map((row) => {
    const metadata = (row.metadata ?? {}) as {
      follow_up_contact?: string;
      assignee?: string;
      deadline?: string;
      suggested_deadline?: string;
    };
    const meeting = row.meeting as unknown as { id: string; title: string | null } | null;
    return {
      id: row.id,
      content: row.content,
      follow_up_contact: metadata.follow_up_contact ?? null,
      assignee: metadata.assignee ?? null,
      deadline: metadata.deadline ?? null,
      suggested_deadline: metadata.suggested_deadline ?? null,
      source_meeting: meeting,
    };
  });

  const upcomingMeetings = (upcomingResult.data ?? [])
    .map(
      (link) =>
        link.meeting as unknown as { id: string; title: string | null; date: string | null } | null,
    )
    .filter(
      (m): m is { id: string; title: string | null; date: string } =>
        m !== null && typeof m.date === "string" && m.date >= todayIso,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return {
    project,
    segments,
    waitingOnClient,
    upcomingMeetings,
  };
}

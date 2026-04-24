import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import { getLatestSummary } from "./core";

export interface WeeklyProjectData {
  project_id: string;
  project_name: string;
  briefing: string | null;
  tasks: {
    title: string;
    status: string;
    assigned_to: string | null;
    due_date: string | null;
  }[];
  meetings_this_week: {
    title: string | null;
    date: string | null;
    meeting_type: string | null;
    summary: string | null;
  }[];
  extractions_this_week: {
    type: string;
    content: string;
  }[];
}

/**
 * Collect all data needed for the weekly summary AI agent.
 * Per active project: briefing, tasks, meetings this week, new extractions.
 * Uses batch queries to avoid N+1.
 */
export async function getWeeklyProjectData(
  weekStart: string,
  weekEnd: string,
  client?: SupabaseClient,
): Promise<WeeklyProjectData[]> {
  const db = client ?? getAdminClient();

  // Get all active projects (not archived/cancelled)
  const { data: projects } = await db
    .from("projects")
    .select("id, name, status")
    .not("status", "in", "(archived,cancelled)")
    .order("name");

  if (!projects || projects.length === 0) return [];

  const projectIds = projects.map((p) => p.id);

  // Batch: all data in parallel (no per-project loops)
  const [meetingLinksResult, extractionsResult, allTasksResult, ...briefingResults] =
    await Promise.all([
      // All meeting links for all projects
      db
        .from("meeting_projects")
        .select(
          `project_id, meeting:meetings!inner(id, title, date, meeting_type, ai_briefing, verification_status)`,
        )
        .in("project_id", projectIds)
        .eq("meetings.verification_status", "verified"),

      // All extractions for all projects this week
      db
        .from("extractions")
        .select("project_id, type, content")
        .in("project_id", projectIds)
        .eq("verification_status", "verified")
        .gte("created_at", weekStart)
        .lte("created_at", weekEnd),

      // All active tasks with their extraction's meeting_id
      db
        .from("tasks")
        .select(
          `title, status, due_date,
         assigned_person:people(name),
         extraction:extractions!inner(meeting_id, project_id)`,
        )
        .eq("status", "active"),

      // Briefings for all projects (parallel per project via Promise.all spread)
      ...projectIds.map((id) => getLatestSummary("project", id, "briefing", db)),
    ]);

  // Index briefings by project ID
  const briefingMap = new Map<string, string | null>();
  for (let i = 0; i < projectIds.length; i++) {
    const briefing = briefingResults[i] as Awaited<ReturnType<typeof getLatestSummary>>;
    briefingMap.set(projectIds[i], briefing?.content ?? null);
  }

  // Group meeting links by project
  type MeetingRow = {
    id: string;
    title: string | null;
    date: string | null;
    meeting_type: string | null;
    ai_briefing: string | null;
    verification_status: string;
  };
  const meetingsByProject = new Map<string, MeetingRow[]>();
  for (const link of meetingLinksResult.data ?? []) {
    const projectId = (link as unknown as { project_id: string }).project_id;
    const meeting = link.meeting as unknown as MeetingRow;
    if (!meeting) continue;
    const list = meetingsByProject.get(projectId) ?? [];
    list.push(meeting);
    meetingsByProject.set(projectId, list);
  }

  // Group extractions by project
  const extractionsByProject = new Map<string, { type: string; content: string }[]>();
  for (const e of extractionsResult.data ?? []) {
    const projectId = (e as unknown as { project_id: string }).project_id;
    const list = extractionsByProject.get(projectId) ?? [];
    list.push({ type: e.type, content: e.content });
    extractionsByProject.set(projectId, list);
  }

  // Build set of verified meeting IDs per project for task matching
  const meetingIdsByProject = new Map<string, Set<string>>();
  for (const [projectId, meetings] of meetingsByProject) {
    meetingIdsByProject.set(projectId, new Set(meetings.map((m) => m.id)));
  }

  // Group tasks by project (via extraction.meeting_id → project's meetings)
  const tasksByProject = new Map<string, WeeklyProjectData["tasks"]>();
  for (const t of allTasksResult.data ?? []) {
    const extraction = t.extraction as unknown as {
      meeting_id: string;
      project_id: string | null;
    } | null;
    if (!extraction) continue;

    // Find which project this task belongs to via extraction.project_id or meeting match
    let matchedProjectId: string | null = null;
    if (extraction.project_id && projectIds.includes(extraction.project_id)) {
      matchedProjectId = extraction.project_id;
    } else {
      for (const [projectId, meetingIds] of meetingIdsByProject) {
        if (meetingIds.has(extraction.meeting_id)) {
          matchedProjectId = projectId;
          break;
        }
      }
    }

    if (!matchedProjectId) continue;

    const list = tasksByProject.get(matchedProjectId) ?? [];
    list.push({
      title: t.title,
      status: t.status,
      assigned_to: (t.assigned_person as unknown as { name: string } | null)?.name ?? null,
      due_date: t.due_date,
    });
    tasksByProject.set(matchedProjectId, list);
  }

  // Assemble results per project
  return projects.map((project) => {
    const meetings = meetingsByProject.get(project.id) ?? [];

    // Filter meetings for this week
    const meetingsThisWeek = meetings
      .filter((m) => m.date && m.date >= weekStart && m.date <= weekEnd)
      .map((m) => ({
        title: m.title,
        date: m.date,
        meeting_type: m.meeting_type,
        summary: m.ai_briefing,
      }));

    return {
      project_id: project.id,
      project_name: project.name,
      briefing: briefingMap.get(project.id) ?? null,
      tasks: tasksByProject.get(project.id) ?? [],
      meetings_this_week: meetingsThisWeek,
      extractions_this_week: extractionsByProject.get(project.id) ?? [],
    };
  });
}

/**
 * Get the latest weekly summary from the summaries table.
 */
export async function getLatestWeeklySummary(client?: SupabaseClient) {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("summaries")
    .select(
      "id, entity_type, entity_id, summary_type, content, version, source_meeting_ids, structured_content, created_at",
    )
    .eq("entity_type", "company")
    .eq("summary_type", "weekly")
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[getLatestWeeklySummary]", error.message);
    return null;
  }

  return data;
}

/**
 * List all weekly summaries, most recent first.
 */
export async function listWeeklySummaries(limit: number = 10, client?: SupabaseClient) {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("summaries")
    .select("id, content, version, structured_content, created_at")
    .eq("entity_type", "company")
    .eq("summary_type", "weekly")
    .order("version", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listWeeklySummaries]", error.message);
    return [];
  }

  return data ?? [];
}

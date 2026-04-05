import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";
import { getLatestSummary } from "./summaries";

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

  const results: WeeklyProjectData[] = [];

  for (const project of projects) {
    // Run queries in parallel per project
    const [briefingSummary, tasksResult, meetingLinksResult, extractionsResult] =
      await Promise.all([
        getLatestSummary("project", project.id, "briefing", db),
        db
          .from("tasks")
          .select(
            `title, status, due_date,
             assigned_person:people(name)`,
          )
          .eq("extraction_id", project.id)
          // Tasks linked via extraction → meeting → project, but we query differently
          // Actually tasks don't have project_id directly, so we need meeting_projects
          .in("status", ["active"]),
        db
          .from("meeting_projects")
          .select(
            `meeting:meetings(id, title, date, meeting_type, ai_briefing, verification_status)`,
          )
          .eq("project_id", project.id),
        db
          .from("extractions")
          .select("type, content, created_at")
          .eq("project_id", project.id)
          .eq("verification_status", "verified")
          .gte("created_at", weekStart)
          .lte("created_at", weekEnd),
      ]);

    // Filter meetings for this week
    const allMeetings = (meetingLinksResult.data ?? [])
      .map(
        (link) =>
          link.meeting as unknown as {
            id: string;
            title: string | null;
            date: string | null;
            meeting_type: string | null;
            ai_briefing: string | null;
            verification_status: string;
          },
      )
      .filter(Boolean);

    const meetingsThisWeek = allMeetings
      .filter(
        (m) =>
          m.verification_status === "verified" &&
          m.date &&
          m.date >= weekStart &&
          m.date <= weekEnd,
      )
      .map((m) => ({
        title: m.title,
        date: m.date,
        meeting_type: m.meeting_type,
        summary: m.ai_briefing,
      }));

    // Get all verified meeting IDs for this project to find tasks
    const verifiedMeetingIds = allMeetings
      .filter((m) => m.verification_status === "verified")
      .map((m) => m.id);

    // Get tasks linked to this project's meetings via extractions
    let tasks: WeeklyProjectData["tasks"] = [];
    if (verifiedMeetingIds.length > 0) {
      const { data: projectTasks } = await db
        .from("tasks")
        .select(
          `title, status, due_date,
           assigned_person:people(name),
           extraction:extractions(meeting_id)`,
        )
        .eq("status", "active");

      if (projectTasks) {
        tasks = projectTasks
          .filter((t) => {
            const extraction = t.extraction as unknown as { meeting_id: string } | null;
            return extraction && verifiedMeetingIds.includes(extraction.meeting_id);
          })
          .map((t) => ({
            title: t.title,
            status: t.status,
            assigned_to: (t.assigned_person as unknown as { name: string } | null)?.name ?? null,
            due_date: t.due_date,
          }));
      }
    }

    results.push({
      project_id: project.id,
      project_name: project.name,
      briefing: briefingSummary?.content ?? null,
      tasks,
      meetings_this_week: meetingsThisWeek,
      extractions_this_week: (extractionsResult.data ?? []).map((e) => ({
        type: e.type,
        content: e.content,
      })),
    });
  }

  return results;
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
export async function listWeeklySummaries(
  limit: number = 10,
  client?: SupabaseClient,
) {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("summaries")
    .select(
      "id, content, version, structured_content, created_at",
    )
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

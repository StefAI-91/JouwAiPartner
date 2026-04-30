import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

export interface ProjectListItem {
  id: string;
  name: string;
  status: string;
  organization: { name: string } | null;
  last_meeting_date: string | null;
  open_action_count: number;
  deadline: string | null;
  owner: { name: string } | null;
}

export async function listProjects(
  client?: SupabaseClient,
  options?: { limit?: number },
): Promise<ProjectListItem[]> {
  const db = client ?? getAdminClient();

  // Get projects with organization
  const { data: projects, error } = await db
    .from("projects")
    .select(
      `id, name, status, deadline,
       organization:organizations(name),
       owner:people!projects_owner_id_fkey(name)`,
    )
    .order("updated_at", { ascending: false })
    .limit(options?.limit ?? 500);

  if (error) {
    console.error("[listProjects]", error.message);
    return [];
  }
  if (!projects || projects.length === 0) return [];

  const projectIds = projects.map((p) => p.id);

  // Batch: last meeting date per project via meeting_projects
  const { data: meetingLinks } = await db
    .from("meeting_projects")
    .select("project_id, meeting:meetings(date)")
    .in("project_id", projectIds);

  const lastMeetingMap = new Map<string, string>();
  if (meetingLinks) {
    for (const link of meetingLinks) {
      const date = (link.meeting as unknown as { date: string | null })?.date;
      if (!date) continue;
      const existing = lastMeetingMap.get(link.project_id);
      if (!existing || date > existing) {
        lastMeetingMap.set(link.project_id, date);
      }
    }
  }

  // Batch: open action item count per project
  const { data: actionItems } = await db
    .from("extractions")
    .select("project_id")
    .in("project_id", projectIds)
    .eq("type", "action_item");

  const actionCountMap = new Map<string, number>();
  if (actionItems) {
    for (const item of actionItems) {
      if (!item.project_id) continue;
      actionCountMap.set(item.project_id, (actionCountMap.get(item.project_id) ?? 0) + 1);
    }
  }

  return (
    projects as unknown as {
      id: string;
      name: string;
      status: string;
      deadline: string | null;
      organization: { name: string } | null;
      owner: { name: string } | null;
    }[]
  ).map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    organization: p.organization,
    last_meeting_date: lastMeetingMap.get(p.id) ?? null,
    open_action_count: actionCountMap.get(p.id) ?? 0,
    deadline: p.deadline,
    owner: p.owner,
  }));
}

export interface FocusProject {
  id: string;
  name: string;
  organization_name: string | null;
}

/**
 * Snelkoppelingen naar actieve projecten voor de sidebar.
 * Filter: alleen delivery-fases (kickoff / in_progress / review / maintenance).
 * Sortering: updated_at DESC — recentste activiteit bovenaan.
 * Limiet: klein houden zodat de sidebar compact blijft.
 */
export async function listFocusProjects(
  client?: SupabaseClient,
  options?: { limit?: number },
): Promise<FocusProject[]> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("projects")
    .select("id, name, organization:organizations(name)")
    .in("status", ["kickoff", "in_progress", "review", "maintenance"])
    .order("updated_at", { ascending: false })
    .limit(options?.limit ?? 5);

  if (error) {
    console.error("[listFocusProjects]", error.message);
    return [];
  }
  if (!data) return [];

  return (
    data as unknown as {
      id: string;
      name: string;
      organization: { name: string } | null;
    }[]
  ).map((p) => ({
    id: p.id,
    name: p.name,
    organization_name: p.organization?.name ?? null,
  }));
}

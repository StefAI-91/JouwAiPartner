import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";
import { getLatestSummary } from "./summaries";

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

export async function listProjects(client?: SupabaseClient): Promise<ProjectListItem[]> {
  const db = client ?? getAdminClient();

  // Get projects with organization
  const { data: projects, error } = await db
    .from("projects")
    .select(
      `id, name, status, deadline,
       organization:organizations(name),
       owner:people!projects_owner_id_fkey(name)`,
    )
    .order("updated_at", { ascending: false });

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

export interface ProjectDetail {
  id: string;
  name: string;
  status: string;
  description: string | null;
  organization_id: string | null;
  organization: { name: string } | null;
  owner: { id: string; name: string } | null;
  contact_person: { id: string; name: string } | null;
  start_date: string | null;
  deadline: string | null;
  meetings: {
    id: string;
    title: string | null;
    date: string | null;
    meeting_type: string | null;
    verification_status: string;
  }[];
  extractions: {
    id: string;
    type: string;
    content: string;
    confidence: number | null;
    transcript_ref: string | null;
    metadata: Record<string, unknown>;
    meeting: { id: string; title: string | null } | null;
  }[];
  context_summary: { content: string; version: number; created_at: string } | null;
  briefing_summary: { content: string; version: number; created_at: string } | null;
}

export async function getProjectById(
  projectId: string,
  client?: SupabaseClient,
): Promise<ProjectDetail | null> {
  const db = client ?? getAdminClient();

  const { data: project, error } = await db
    .from("projects")
    .select(
      `id, name, status, description, organization_id, start_date, deadline,
       organization:organizations(name),
       owner:people!projects_owner_id_fkey(id, name),
       contact_person:people!projects_contact_person_id_fkey(id, name)`,
    )
    .eq("id", projectId)
    .single();

  if (error) {
    console.error("[getProjectById]", error.message);
    return null;
  }

  // Get linked meetings via junction table
  const { data: meetingLinks } = await db
    .from("meeting_projects")
    .select("meeting:meetings(id, title, date, meeting_type, verification_status)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const meetings = (meetingLinks ?? [])
    .map((link) => link.meeting as unknown as ProjectDetail["meetings"][number])
    .filter(Boolean)
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });

  // Get verified extractions linked to this project
  const { data: extractions } = await db
    .from("extractions")
    .select(
      `id, type, content, confidence, transcript_ref, metadata,
       meeting:meetings(id, title)`,
    )
    .eq("project_id", projectId)
    .eq("verification_status", "verified")
    .order("created_at", { ascending: false });

  // Get latest summaries
  const [contextSummary, briefingSummary] = await Promise.all([
    getLatestSummary("project", projectId, "context", db),
    getLatestSummary("project", projectId, "briefing", db),
  ]);

  const typedProject = project as unknown as {
    id: string;
    name: string;
    status: string;
    description: string | null;
    organization_id: string | null;
    start_date: string | null;
    deadline: string | null;
    organization: { name: string } | null;
    owner: { id: string; name: string } | null;
    contact_person: { id: string; name: string } | null;
  };

  return {
    id: typedProject.id,
    name: typedProject.name,
    status: typedProject.status,
    description: typedProject.description,
    organization_id: typedProject.organization_id,
    start_date: typedProject.start_date,
    deadline: typedProject.deadline,
    organization: typedProject.organization,
    owner: typedProject.owner,
    contact_person: typedProject.contact_person,
    meetings,
    extractions: (extractions ?? []) as unknown as ProjectDetail["extractions"],
    context_summary: contextSummary
      ? { content: contextSummary.content, version: contextSummary.version, created_at: contextSummary.created_at }
      : null,
    briefing_summary: briefingSummary
      ? { content: briefingSummary.content, version: briefingSummary.version, created_at: briefingSummary.created_at }
      : null,
  };
}

export async function getProjectByNameIlike(name: string) {
  const { data } = await getAdminClient()
    .from("projects")
    .select("id, name, aliases")
    .ilike("name", `%${name}%`)
    .limit(1)
    .single();
  return data;
}

export async function getAllProjects() {
  const { data } = await getAdminClient().from("projects").select("id, name, aliases");
  return data;
}

export async function matchProjectsByEmbedding(
  embedding: number[],
  threshold: number = 0.85,
  count: number = 3,
) {
  const { data, error } = await getAdminClient().rpc("match_projects", {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: count,
  });
  if (error) return null;
  return data;
}

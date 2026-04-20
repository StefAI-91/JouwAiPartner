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

export interface ProjectDetail {
  id: string;
  name: string;
  status: string;
  description: string | null;
  github_url: string | null;
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
  emails: {
    id: string;
    subject: string | null;
    from_name: string | null;
    from_address: string;
    date: string;
    snippet: string | null;
    email_type: string | null;
    party_type: string | null;
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
  email_extractions: {
    id: string;
    type: string;
    content: string;
    confidence: number | null;
    source_ref: string | null;
    metadata: Record<string, unknown>;
    email: { id: string; subject: string | null } | null;
  }[];
  context_summary: { content: string; version: number; created_at: string } | null;
  briefing_summary: {
    content: string;
    version: number;
    created_at: string;
    structured_content: Record<string, unknown> | null;
  } | null;
}

export async function getProjectById(
  projectId: string,
  client?: SupabaseClient,
): Promise<ProjectDetail | null> {
  const db = client ?? getAdminClient();

  const { data: project, error } = await db
    .from("projects")
    .select(
      `id, name, status, description, github_url, organization_id, start_date, deadline,
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

  // Run independent queries in parallel
  const [
    meetingLinksResult,
    emailLinksResult,
    extractionsResult,
    emailExtractionsResult,
    contextSummary,
    briefingSummary,
  ] = await Promise.all([
    db
      .from("meeting_projects")
      .select("meeting:meetings(id, title, date, meeting_type, verification_status)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    db
      .from("email_projects")
      .select(
        "email:emails(id, subject, from_name, from_address, date, snippet, email_type, party_type, verification_status)",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    db
      .from("extractions")
      .select(
        `id, type, content, confidence, transcript_ref, metadata,
         meeting:meetings(id, title)`,
      )
      .eq("project_id", projectId)
      .eq("verification_status", "verified")
      .order("created_at", { ascending: false }),
    db
      .from("email_extractions")
      .select(
        `id, type, content, confidence, source_ref, metadata,
         email:emails(id, subject)`,
      )
      .eq("project_id", projectId)
      .eq("verification_status", "verified")
      .order("created_at", { ascending: false }),
    getLatestSummary("project", projectId, "context", db),
    getLatestSummary("project", projectId, "briefing", db),
  ]);

  const meetings = (meetingLinksResult.data ?? [])
    .map((link) => link.meeting as unknown as ProjectDetail["meetings"][number])
    .filter(Boolean)
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });

  const emails = (emailLinksResult.data ?? [])
    .map((link) => link.email as unknown as ProjectDetail["emails"][number])
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date));

  const typedProject = project as unknown as {
    id: string;
    name: string;
    status: string;
    description: string | null;
    github_url: string | null;
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
    github_url: typedProject.github_url,
    organization_id: typedProject.organization_id,
    start_date: typedProject.start_date,
    deadline: typedProject.deadline,
    organization: typedProject.organization,
    owner: typedProject.owner,
    contact_person: typedProject.contact_person,
    meetings,
    emails,
    extractions: (extractionsResult.data ?? []) as unknown as ProjectDetail["extractions"],
    email_extractions: (emailExtractionsResult.data ??
      []) as unknown as ProjectDetail["email_extractions"],
    context_summary: contextSummary
      ? {
          content: contextSummary.content,
          version: contextSummary.version,
          created_at: contextSummary.created_at,
        }
      : null,
    briefing_summary: briefingSummary
      ? {
          content: briefingSummary.content,
          version: briefingSummary.version,
          created_at: briefingSummary.created_at,
          structured_content: briefingSummary.structured_content,
        }
      : null,
  };
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

/**
 * Q2b-B: lichte single-column read voor de segment-link feedback flow die
 * de huidige `aliases`-array nodig heeft om `project_name_raw` toe te voegen
 * zonder duplicaten.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function getProjectAliases(
  projectId: string,
  client?: SupabaseClient,
): Promise<string[] | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("projects")
    .select("aliases")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    console.error("[getProjectAliases]", error.message);
    return null;
  }
  if (!data) return null;
  return (data.aliases as string[] | null) ?? [];
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

export interface ActiveProjectForContext {
  id: string;
  name: string;
  aliases: string[];
  organization_name: string | null;
}

/**
 * Get active projects (not completed/lost) with organization name.
 * Used by Gatekeeper context-injection for project identification.
 */
export async function getActiveProjectsForContext(): Promise<ActiveProjectForContext[]> {
  const { data, error } = await getAdminClient()
    .from("projects")
    .select("id, name, aliases, organization:organizations(name)")
    .not("status", "in", '("completed","lost")');

  if (error || !data) return [];
  return data.map((p) => {
    const org = p.organization as unknown as { name: string } | null;
    return {
      id: p.id,
      name: p.name,
      aliases: p.aliases ?? [],
      organization_name: org?.name ?? null,
    };
  });
}

// ── Q2b-C: helpers voor devhub (Slack-notifs + userback sync) ──

/**
 * Haal de naam van één project op (single column). Gebruikt door DevHub
 * Slack-notifs die een human-readable project-naam in de payload nodig hebben.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function getProjectName(
  projectId: string,
  client?: SupabaseClient,
): Promise<string | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    console.error("[getProjectName]", error.message);
    return null;
  }
  return (data?.name as string | null) ?? null;
}

/**
 * Zoek een project op basis van de Userback-project-ID (string kolom). Geeft
 * alleen het `id` terug — de Userback-sync route heeft niets anders nodig.
 * Admin-scope variant; de user-scoped page-variant volgt in Q2c.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function getProjectByUserbackProjectId(
  userbackProjectId: string,
  client?: SupabaseClient,
): Promise<{ id: string } | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("projects")
    .select("id")
    .eq("userback_project_id", userbackProjectId)
    .maybeSingle();

  if (error) {
    console.error("[getProjectByUserbackProjectId]", error.message);
    return null;
  }
  return data ? { id: data.id as string } : null;
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

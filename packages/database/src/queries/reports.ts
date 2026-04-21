import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";
import type { IssueStatus, IssueType } from "../constants/issues";

/**
 * Query-laag voor project-rapportages. Wordt primair geconsumeerd door de MCP
 * tools in `packages/mcp/src/tools/` zodat Claude Desktop een rapport kan
 * genereren. De functies zijn bewust generiek zodat een toekomstige UI-route
 * ze zonder refactor kan hergebruiken.
 */

// ────────────────────────────────────────────────────────────────────────────
// Shared types
// ────────────────────────────────────────────────────────────────────────────

export interface IssueReportRow {
  id: string;
  issue_number: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  component: string | null;
  severity: string | null;
  labels: string[];
  source: string;
  source_url: string | null;
  reporter_name: string | null;
  reporter_email: string | null;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface IssueCommentReport {
  author_name: string;
  body: string;
  created_at: string;
}

export interface IssueActivityReport {
  actor_name: string | null;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface IssueDetailReport extends IssueReportRow {
  project: { id: string; name: string; organization_name: string | null } | null;
  comments: IssueCommentReport[];
  activity: IssueActivityReport[];
}

export interface ProjectActivityEvent {
  issue_id: string;
  issue_number: number;
  issue_title: string;
  actor_name: string | null;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface ProjectContextReport {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  deadline: string | null;
  description: string | null;
  organization: { id: string; name: string } | null;
  owner_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  summaries: {
    context: string | null;
    briefing: string | null;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Bereken ISO-cutoff voor `days_back` dagen terug vanaf nu. Wordt gebruikt als
 * drempel in de OR-filter op `created_at`, `updated_at` en `closed_at`.
 */
function cutoffIsoFromDaysBack(daysBack: number): string {
  return new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
}

const REPORT_ISSUE_SELECT = `
  id, issue_number, title, description, type, status, priority, component, severity,
  labels, source, source_url, reporter_name, reporter_email, assigned_to,
  created_at, updated_at, closed_at,
  assigned_person:assigned_to (id, full_name)
` as const;

interface RawIssueWithAssigned {
  id: string;
  issue_number: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  component: string | null;
  severity: string | null;
  labels: string[] | null;
  source: string;
  source_url: string | null;
  reporter_name: string | null;
  reporter_email: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  assigned_person: { id: string; full_name: string | null } | null;
}

function mapIssueRow(row: RawIssueWithAssigned): IssueReportRow {
  return {
    id: row.id,
    issue_number: row.issue_number,
    title: row.title,
    description: row.description,
    type: row.type,
    status: row.status,
    priority: row.priority,
    component: row.component,
    severity: row.severity,
    labels: row.labels ?? [],
    source: row.source,
    source_url: row.source_url,
    reporter_name: row.reporter_name,
    reporter_email: row.reporter_email,
    assigned_to_id: row.assigned_to,
    assigned_to_name: row.assigned_person?.full_name ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    closed_at: row.closed_at,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 1. getProjectIssuesForReport
// ────────────────────────────────────────────────────────────────────────────

/**
 * Haal issues op voor een project binnen een tijdvenster. Gebruikt OR-logica
 * op `created_at`, `updated_at` en `closed_at`: een issue is relevant als het
 * binnen het venster is aangemaakt, bewerkt, óf gesloten. Dat zorgt dat een
 * issue dat maanden geleden is gemeld maar recent is afgerond tóch in het
 * rapport staat.
 */
export async function getProjectIssuesForReport(
  projectId: string,
  daysBack: number,
  filters?: {
    status?: IssueStatus;
    type?: IssueType;
    limit?: number;
    offset?: number;
  },
  client?: SupabaseClient,
): Promise<IssueReportRow[]> {
  const db = client ?? getAdminClient();
  const cutoff = cutoffIsoFromDaysBack(daysBack);
  const limit = Math.min(filters?.limit ?? 100, 200);
  const offset = Math.max(filters?.offset ?? 0, 0);

  let query = db
    .from("issues")
    .select(REPORT_ISSUE_SELECT)
    .eq("project_id", projectId)
    .or(`created_at.gte.${cutoff},updated_at.gte.${cutoff},closed_at.gte.${cutoff}`)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.type) {
    query = query.eq("type", filters.type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getProjectIssuesForReport] Database error:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as RawIssueWithAssigned[]).map(mapIssueRow);
}

// ────────────────────────────────────────────────────────────────────────────
// 2. getIssueDetailForReport
// ────────────────────────────────────────────────────────────────────────────

interface RawIssueDetail extends RawIssueWithAssigned {
  project: {
    id: string;
    name: string;
    organization: { id: string; name: string } | null;
  } | null;
}

/**
 * Haal één issue op inclusief alle comments en de volledige activity-log.
 * Geeft `null` als het issue niet bestaat.
 */
export async function getIssueDetailForReport(
  issueId: string,
  client?: SupabaseClient,
): Promise<IssueDetailReport | null> {
  const db = client ?? getAdminClient();

  const { data: issueRow, error: issueError } = await db
    .from("issues")
    .select(
      `${REPORT_ISSUE_SELECT},
       project:project_id (id, name, organization:organization_id (id, name))`,
    )
    .eq("id", issueId)
    .maybeSingle();

  if (issueError) {
    console.error("[getIssueDetailForReport] issue error:", issueError.message);
    return null;
  }
  if (!issueRow) return null;

  const raw = issueRow as unknown as RawIssueDetail;
  const base = mapIssueRow(raw);

  const [commentsResult, activityResult] = await Promise.all([
    db
      .from("issue_comments")
      .select("body, created_at, author:author_id (id, full_name)")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: true }),
    db
      .from("issue_activity")
      .select(
        "action, field, old_value, new_value, created_at, metadata, actor:actor_id (id, full_name)",
      )
      .eq("issue_id", issueId)
      .order("created_at", { ascending: true }),
  ]);

  if (commentsResult.error) {
    console.error("[getIssueDetailForReport] comments error:", commentsResult.error.message);
  }
  if (activityResult.error) {
    console.error("[getIssueDetailForReport] activity error:", activityResult.error.message);
  }

  const commentRows = (commentsResult.data ?? []) as unknown as Array<{
    body: string;
    created_at: string;
    author: { id: string; full_name: string | null } | null;
  }>;

  const activityRows = (activityResult.data ?? []) as unknown as Array<{
    action: string;
    field: string | null;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
    metadata: Record<string, unknown> | null;
    actor: { id: string; full_name: string | null } | null;
  }>;

  const comments: IssueCommentReport[] = commentRows.map((c) => ({
    author_name: c.author?.full_name ?? "Onbekend",
    body: c.body,
    created_at: c.created_at,
  }));

  const activity: IssueActivityReport[] = activityRows.map((a) => ({
    actor_name: a.actor?.full_name ?? null,
    action: a.action,
    field: a.field,
    old_value: a.old_value,
    new_value: a.new_value,
    created_at: a.created_at,
    metadata: a.metadata,
  }));

  return {
    ...base,
    project: raw.project
      ? {
          id: raw.project.id,
          name: raw.project.name,
          organization_name: raw.project.organization?.name ?? null,
        }
      : null,
    comments,
    activity,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 3. getProjectActivityForReport
// ────────────────────────────────────────────────────────────────────────────

/**
 * Haal alle activity-events op voor een project binnen een tijdvenster.
 * Eerst worden de issue-IDs van het project verzameld, vervolgens wordt
 * activity gefilterd op die IDs én op `created_at >= cutoff`. Twee queries,
 * maar explicieter en betrouwbaarder dan nested filtering via embedded
 * resources — en schaalbaar tot duizenden issues per project.
 */
export async function getProjectActivityForReport(
  projectId: string,
  daysBack: number,
  client?: SupabaseClient,
): Promise<ProjectActivityEvent[]> {
  const db = client ?? getAdminClient();
  const cutoff = cutoffIsoFromDaysBack(daysBack);

  const { data: issueRows, error: issuesError } = await db
    .from("issues")
    .select("id, issue_number, title")
    .eq("project_id", projectId);

  if (issuesError) {
    console.error("[getProjectActivityForReport] issues error:", issuesError.message);
    return [];
  }
  if (!issueRows || issueRows.length === 0) return [];

  const issueMap = new Map<string, { issue_number: number; title: string }>();
  for (const row of issueRows as { id: string; issue_number: number; title: string }[]) {
    issueMap.set(row.id, { issue_number: row.issue_number, title: row.title });
  }
  const issueIds = [...issueMap.keys()];

  const { data: activityRows, error: activityError } = await db
    .from("issue_activity")
    .select(
      "issue_id, action, field, old_value, new_value, created_at, actor:actor_id (id, full_name)",
    )
    .in("issue_id", issueIds)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false });

  if (activityError) {
    console.error("[getProjectActivityForReport] activity error:", activityError.message);
    return [];
  }

  const rows = (activityRows ?? []) as unknown as Array<{
    issue_id: string;
    action: string;
    field: string | null;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
    actor: { id: string; full_name: string | null } | null;
  }>;

  return rows.flatMap((row) => {
    const issueMeta = issueMap.get(row.issue_id);
    if (!issueMeta) return [];
    return [
      {
        issue_id: row.issue_id,
        issue_number: issueMeta.issue_number,
        issue_title: issueMeta.title,
        actor_name: row.actor?.full_name ?? null,
        action: row.action,
        field: row.field,
        old_value: row.old_value,
        new_value: row.new_value,
        created_at: row.created_at,
      },
    ];
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 4. getProjectContextForReport
// ────────────────────────────────────────────────────────────────────────────

/**
 * Haal project-meta, organisatie, owner, contactpersoon en de laatste
 * `context` en `briefing` summaries op. De summaries komen uit de bestaande
 * project-summarizer pipeline en geven de AI een beknopte projectbeschrijving
 * + forward-looking briefing mee voor rapportage-context.
 */
export async function getProjectContextForReport(
  projectId: string,
  client?: SupabaseClient,
): Promise<ProjectContextReport | null> {
  const db = client ?? getAdminClient();

  const { data: projectRow, error: projectError } = await db
    .from("projects")
    .select(
      `id, name, status, start_date, deadline, description,
       organization:organization_id (id, name),
       owner:owner_id (id, name),
       contact:contact_person_id (id, name, email)`,
    )
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    console.error("[getProjectContextForReport] project error:", projectError.message);
    return null;
  }
  if (!projectRow) return null;

  const project = projectRow as unknown as {
    id: string;
    name: string;
    status: string | null;
    start_date: string | null;
    deadline: string | null;
    description: string | null;
    organization: { id: string; name: string } | null;
    owner: { id: string; name: string } | null;
    contact: { id: string; name: string; email: string | null } | null;
  };

  const [contextSummary, briefingSummary] = await Promise.all([
    db
      .from("summaries")
      .select("content")
      .eq("entity_type", "project")
      .eq("entity_id", projectId)
      .eq("summary_type", "context")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("summaries")
      .select("content")
      .eq("entity_type", "project")
      .eq("entity_id", projectId)
      .eq("summary_type", "briefing")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    id: project.id,
    name: project.name,
    status: project.status ?? "unknown",
    start_date: project.start_date,
    deadline: project.deadline,
    description: project.description,
    organization: project.organization,
    owner_name: project.owner?.name ?? null,
    contact_name: project.contact?.name ?? null,
    contact_email: project.contact?.email ?? null,
    summaries: {
      context: (contextSummary.data as { content: string } | null)?.content ?? null,
      briefing: (briefingSummary.data as { content: string } | null)?.content ?? null,
    },
  };
}

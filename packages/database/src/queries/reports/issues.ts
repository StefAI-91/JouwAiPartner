import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import type { IssueStatus, IssueType } from "../../constants/issues";
import {
  REPORT_ISSUE_SELECT,
  cutoffIsoFromDaysBack,
  mapIssueRow,
  type IssueReportRow,
  type PaginatedResult,
  type RawIssueWithAssigned,
} from "./internals";

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
): Promise<PaginatedResult<IssueReportRow>> {
  const db = client ?? getAdminClient();
  const cutoff = cutoffIsoFromDaysBack(daysBack);
  const limit = Math.min(filters?.limit ?? 25, 200);
  const offset = Math.max(filters?.offset ?? 0, 0);

  let query = db
    .from("issues")
    .select(REPORT_ISSUE_SELECT, { count: "exact" })
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

  const { data, error, count } = await query;

  if (error) {
    console.error("[getProjectIssuesForReport] Database error:", error.message);
    return { rows: [], totalCount: 0 };
  }

  const rows = ((data ?? []) as unknown as RawIssueWithAssigned[]).map(mapIssueRow);
  return { rows, totalCount: count ?? rows.length };
}

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

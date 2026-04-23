import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";
import { PRIORITY_ORDER, UNASSIGNED_SENTINEL } from "../constants/issues";

// Re-export so existing callers that import from queries/issues keep working.
export { UNASSIGNED_SENTINEL };

export const ISSUE_SORTS = ["priority", "newest", "oldest"] as const;
export type IssueSort = (typeof ISSUE_SORTS)[number];

export interface IssueRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  component: string | null;
  severity: string | null;
  labels: string[];
  assigned_to: string | null;
  assigned_person: { id: string; full_name: string } | null;
  reporter_name: string | null;
  reporter_email: string | null;
  source: string;
  userback_id: string | null;
  source_url: string | null;
  source_metadata: Record<string, unknown> | null;
  issue_number: number;
  execution_type: string;
  ai_executable: boolean;
  ai_context: Record<string, unknown> | null;
  ai_result: Record<string, unknown> | null;
  duplicate_of_id: string | null;
  ai_classification: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export const ISSUE_SELECT = `
  id, project_id, title, description, type, status, priority, component, severity,
  labels, assigned_to, reporter_name, reporter_email, source, userback_id, source_url, source_metadata,
  issue_number, execution_type, ai_executable, ai_context, ai_result, duplicate_of_id, ai_classification,
  created_at, updated_at, closed_at,
  assigned_person:assigned_to (id, full_name)
` as const;

/**
 * List issues with filters, pagination, and configurable sort.
 *
 * Scope: supply either `projectId` (single project) or `projectIds` (several
 * projects — used for members with multi-project access). At least one of
 * the two must be provided; an empty `projectIds` returns `[]`.
 *
 * Sort options:
 * - "priority" (default): priority weight (urgent → low), then newest first
 * - "newest": pure chronological, newest first
 * - "oldest": pure chronological, oldest first
 */
// UUID v4/v1 shape — same regex as auth.users.id. Used as a last-line-of-
// defence filter before uuids enter a raw `.or(...)` template so a crafted
// URL param can't break out of the quoted list and inject extra filters.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listIssues(
  params: {
    projectId?: string;
    projectIds?: string[];
    status?: string[];
    priority?: string[];
    type?: string[];
    component?: string[];
    assignedTo?: string[];
    search?: string;
    issueNumber?: number;
    sort?: IssueSort;
    limit?: number;
    offset?: number;
  },
  client?: SupabaseClient,
): Promise<IssueRow[]> {
  const db = client ?? getAdminClient();
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const sort: IssueSort = params.sort ?? "priority";

  if (params.projectIds && params.projectIds.length === 0) return [];

  let query = db.from("issues").select(ISSUE_SELECT);
  if (params.projectIds) {
    query = query.in("project_id", params.projectIds);
  } else if (params.projectId) {
    query = query.eq("project_id", params.projectId);
  } else {
    return [];
  }

  if (params.status && params.status.length > 0) {
    query = query.in("status", params.status);
  }
  if (params.priority && params.priority.length > 0) {
    query = query.in("priority", params.priority);
  }
  if (params.type && params.type.length > 0) {
    query = query.in("type", params.type);
  }
  if (params.component && params.component.length > 0) {
    query = query.in("component", params.component);
  }
  if (params.assignedTo && params.assignedTo.length > 0) {
    const wantsUnassigned = params.assignedTo.includes(UNASSIGNED_SENTINEL);
    const uuids = params.assignedTo.filter((v) => v !== UNASSIGNED_SENTINEL && UUID_RE.test(v));
    if (wantsUnassigned && uuids.length > 0) {
      // Mix of "unassigned" + specific people: OR them together. Uuids are
      // regex-validated above so the quoted list can't be escaped.
      const inList = uuids.map((u) => `"${u}"`).join(",");
      query = query.or(`assigned_to.is.null,assigned_to.in.(${inList})`);
    } else if (wantsUnassigned) {
      query = query.is("assigned_to", null);
    } else if (uuids.length > 0) {
      query = query.in("assigned_to", uuids);
    }
    // Neither wantsUnassigned nor any valid uuid → no-op (all values were
    // garbage). Returning without filter would silently widen the result set,
    // so force an empty match instead.
    if (!wantsUnassigned && uuids.length === 0) {
      query = query.eq("assigned_to", "00000000-0000-0000-0000-000000000000");
    }
  }
  if (params.issueNumber !== undefined) {
    query = query.eq("issue_number", params.issueNumber);
  }
  if (params.search) {
    // Sanitize: escape PostgREST special characters to prevent filter injection
    const sanitized = params.search.replace(/[%_\\,().]/g, (ch) => `\\${ch}`);
    query = query.or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
  }

  // Ordering — chronological sorts are pure; priority sort groups by weight.
  if (sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (sort === "newest") {
    query = query.order("created_at", { ascending: false });
  } else {
    // "priority": alphabetical from DB, re-sorted by weight client-side below
    query = query.order("priority", { ascending: true }).order("created_at", { ascending: false });
  }
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error("[listIssues] Database error:", error.message);
    // Bubble up so callers (API routes, Server Components) can surface the
    // failure to the user or their error boundary, instead of returning an
    // empty result that looks indistinguishable from "no issues exist".
    throw new Error(`listIssues failed: ${error.message}`);
  }

  if (!data) return [];

  const rows = data as unknown as IssueRow[];

  if (sort === "priority") {
    // Re-sort by priority weight since DB sorts alphabetically
    rows.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      return 0; // keep DB order (created_at DESC) for same priority
    });
  }

  return rows;
}

/**
 * Count issues matching the same filters as listIssues (for pagination).
 */
export async function countFilteredIssues(
  params: {
    projectId?: string;
    projectIds?: string[];
    status?: string[];
    priority?: string[];
    type?: string[];
    component?: string[];
    assignedTo?: string[];
    search?: string;
    issueNumber?: number;
  },
  client?: SupabaseClient,
): Promise<number> {
  const db = client ?? getAdminClient();

  if (params.projectIds && params.projectIds.length === 0) return 0;

  let query = db.from("issues").select("id", { count: "exact", head: true });
  if (params.projectIds) {
    query = query.in("project_id", params.projectIds);
  } else if (params.projectId) {
    query = query.eq("project_id", params.projectId);
  } else {
    return 0;
  }

  if (params.status && params.status.length > 0) {
    query = query.in("status", params.status);
  }
  if (params.priority && params.priority.length > 0) {
    query = query.in("priority", params.priority);
  }
  if (params.type && params.type.length > 0) {
    query = query.in("type", params.type);
  }
  if (params.component && params.component.length > 0) {
    query = query.in("component", params.component);
  }
  if (params.assignedTo && params.assignedTo.length > 0) {
    const uuids = params.assignedTo.filter((v) => v !== UNASSIGNED_SENTINEL);
    const wantsUnassigned = params.assignedTo.includes(UNASSIGNED_SENTINEL);
    if (wantsUnassigned && uuids.length > 0) {
      const inList = uuids.map((u) => `"${u}"`).join(",");
      query = query.or(`assigned_to.is.null,assigned_to.in.(${inList})`);
    } else if (wantsUnassigned) {
      query = query.is("assigned_to", null);
    } else {
      query = query.in("assigned_to", uuids);
    }
  }
  if (params.issueNumber !== undefined) {
    query = query.eq("issue_number", params.issueNumber);
  }
  if (params.search) {
    const sanitized = params.search.replace(/[%_\\,().]/g, (ch) => `\\${ch}`);
    query = query.or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
  }

  const { count, error } = await query;

  if (error) {
    console.error("[countFilteredIssues] Database error:", error.message);
    throw new Error(`countFilteredIssues failed: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Get a single issue by ID.
 */
export async function getIssueById(id: string, client?: SupabaseClient): Promise<IssueRow | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db.from("issues").select(ISSUE_SELECT).eq("id", id).single();

  if (error) {
    console.error("[getIssueById] Database error:", error.message);
    return null;
  }
  if (!data) return null;
  return data as unknown as IssueRow;
}

export type StatusCountKey = "triage" | "backlog" | "todo" | "in_progress" | "done" | "cancelled";

export type StatusCounts = Record<StatusCountKey, number>;

const STATUS_KEYS: readonly StatusCountKey[] = [
  "triage",
  "backlog",
  "todo",
  "in_progress",
  "done",
  "cancelled",
];

/**
 * Get issue counts per status for a project.
 *
 * Previously ran 6 separate count queries (one per status). Consolidated into
 * a single `select("status")` call and grouped in memory — one round trip
 * instead of six, which is the difference between "instant" and "visible lag"
 * for the sidebar badge.
 */
export async function getIssueCounts(
  projectId: string,
  client?: SupabaseClient,
): Promise<StatusCounts> {
  const db = client ?? getAdminClient();

  const counts: StatusCounts = {
    triage: 0,
    backlog: 0,
    todo: 0,
    in_progress: 0,
    done: 0,
    cancelled: 0,
  };

  const { data, error } = await db.from("issues").select("status").eq("project_id", projectId);

  if (error) {
    console.error("[getIssueCounts] Database error:", error.message);
    return counts;
  }

  if (!data) return counts;

  for (const row of data as { status: string }[]) {
    if ((STATUS_KEYS as readonly string[]).includes(row.status)) {
      counts[row.status as StatusCountKey]++;
    }
  }

  return counts;
}

/**
 * Count critical issues without an assignee (open statuses only).
 */
export async function countCriticalUnassigned(
  projectId: string,
  client?: SupabaseClient,
): Promise<number> {
  const db = client ?? getAdminClient();

  const { count, error } = await db
    .from("issues")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("severity", "critical")
    .is("assigned_to", null)
    .not("status", "in", '("done","cancelled")');

  if (error) {
    console.error("[countCriticalUnassigned] Database error:", error.message);
    return 0;
  }

  return count ?? 0;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";
import { PRIORITY_ORDER } from "../constants/issues";

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
 * List issues with filters, pagination, and priority sorting.
 *
 * Scope: supply either `projectId` (single project) or `projectIds` (several
 * projects — used for members with multi-project access). At least one of
 * the two must be provided; an empty `projectIds` returns `[]`.
 */
export async function listIssues(
  params: {
    projectId?: string;
    projectIds?: string[];
    status?: string[];
    priority?: string[];
    type?: string[];
    component?: string[];
    assignedTo?: string;
    search?: string;
    limit?: number;
    offset?: number;
  },
  client?: SupabaseClient,
): Promise<IssueRow[]> {
  const db = client ?? getAdminClient();
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

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
  if (params.assignedTo) {
    query = query.eq("assigned_to", params.assignedTo);
  }
  if (params.search) {
    // Sanitize: escape PostgREST special characters to prevent filter injection
    const sanitized = params.search.replace(/[%_\\,().]/g, (ch) => `\\${ch}`);
    query = query.or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
  }

  // Sort by priority (urgent first via PRIORITY_ORDER) then created_at DESC
  query = query
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error("[listIssues] Database error:", error.message);
    return [];
  }

  if (!data) return [];

  // Re-sort by priority weight since DB sorts alphabetically
  const rows = data as unknown as IssueRow[];
  rows.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 99;
    const pb = PRIORITY_ORDER[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    return 0; // keep DB order (created_at DESC) for same priority
  });

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
    assignedTo?: string;
    search?: string;
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
  if (params.assignedTo) {
    query = query.eq("assigned_to", params.assignedTo);
  }
  if (params.search) {
    const sanitized = params.search.replace(/[%_\\,().]/g, (ch) => `\\${ch}`);
    query = query.or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
  }

  const { count, error } = await query;

  if (error) {
    console.error("[countFilteredIssues] Database error:", error.message);
    return 0;
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

/**
 * Get issue counts per status for a project (uses DB-level counting).
 */
export async function getIssueCounts(
  projectId: string,
  client?: SupabaseClient,
): Promise<{
  triage: number;
  backlog: number;
  todo: number;
  in_progress: number;
  done: number;
  cancelled: number;
}> {
  const db = client ?? getAdminClient();
  const statuses = ["triage", "backlog", "todo", "in_progress", "done", "cancelled"] as const;

  const results = await Promise.all(
    statuses.map((status) =>
      db
        .from("issues")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("status", status),
    ),
  );

  const counts = { triage: 0, backlog: 0, todo: 0, in_progress: 0, done: 0, cancelled: 0 };

  for (let i = 0; i < statuses.length; i++) {
    const { count, error } = results[i];
    if (error) {
      console.error(`[getIssueCounts] Error counting ${statuses[i]}:`, error.message);
      continue;
    }
    counts[statuses[i]] = count ?? 0;
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

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

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
  assigned_person: { id: string; name: string } | null;
  reporter_name: string | null;
  reporter_email: string | null;
  source: string;
  userback_id: string | null;
  source_url: string | null;
  source_metadata: Record<string, unknown> | null;
  issue_number: number;
  execution_type: string;
  ai_executable: boolean;
  duplicate_of_id: string | null;
  ai_classification: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface IssueCommentRow {
  id: string;
  issue_id: string;
  author_id: string;
  author: { id: string; name: string } | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface IssueActivityRow {
  id: string;
  issue_id: string;
  actor_id: string | null;
  actor: { id: string; name: string } | null;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const ISSUE_SELECT = `
  id, project_id, title, description, type, status, priority, component, severity,
  labels, assigned_to, reporter_name, reporter_email, source, userback_id, source_url, source_metadata,
  issue_number, execution_type, ai_executable, duplicate_of_id, ai_classification,
  created_at, updated_at, closed_at,
  assigned_person:assigned_to (id, name)
` as const;

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * List issues with filters, pagination, and priority sorting.
 */
export async function listIssues(
  params: {
    projectId: string;
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

  let query = db.from("issues").select(ISSUE_SELECT).eq("project_id", params.projectId);

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
 * List comments for an issue, sorted by created_at ASC with pagination.
 */
export async function listIssueComments(
  issueId: string,
  params?: { limit?: number; offset?: number },
  client?: SupabaseClient,
): Promise<IssueCommentRow[]> {
  const db = client ?? getAdminClient();
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;

  const { data, error } = await db
    .from("issue_comments")
    .select(
      `id, issue_id, author_id, body, created_at, updated_at,
       author:author_id (id, name)`,
    )
    .eq("issue_id", issueId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[listIssueComments] Database error:", error.message);
    return [];
  }
  return (data ?? []) as unknown as IssueCommentRow[];
}

/**
 * Get the sync cursor for Userback incremental sync.
 * Returns the most recent userback_modified_at date, or null for first sync.
 */
export async function getUserbackSyncCursor(client?: SupabaseClient): Promise<string | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("issues")
    .select("source_metadata")
    .eq("source", "userback")
    .not("source_metadata", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;

  // Find the max userback_modified_at across all userback issues
  const { data: allItems, error: allError } = await db
    .from("issues")
    .select("source_metadata")
    .eq("source", "userback")
    .not("source_metadata", "is", null);

  if (allError || !allItems || allItems.length === 0) return null;

  let maxDate: string | null = null;
  for (const row of allItems) {
    const meta = row.source_metadata as Record<string, unknown> | null;
    const modifiedAt = meta?.userback_modified_at as string | undefined;
    if (modifiedAt && (!maxDate || modifiedAt > maxDate)) {
      maxDate = modifiedAt;
    }
  }

  return maxDate;
}

/**
 * Get existing userback_ids for dedup check.
 * Returns a Map of userback_id -> issue id.
 */
export async function getExistingUserbackIds(
  userbackIds: string[],
  client?: SupabaseClient,
): Promise<Map<string, string>> {
  if (userbackIds.length === 0) return new Map();
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("issues")
    .select("id, userback_id")
    .in("userback_id", userbackIds);

  if (error || !data) return new Map();

  const map = new Map<string, string>();
  for (const row of data) {
    if (row.userback_id) map.set(row.userback_id, row.id);
  }
  return map;
}

/**
 * Count total userback issues for a project.
 */
export async function countUserbackIssues(
  projectId: string,
  client?: SupabaseClient,
): Promise<number> {
  const db = client ?? getAdminClient();
  const { count, error } = await db
    .from("issues")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("source", "userback");

  if (error) return 0;
  return count ?? 0;
}

/**
 * List activity for an issue, sorted by created_at DESC with pagination.
 */
export async function listIssueActivity(
  issueId: string,
  params?: { limit?: number; offset?: number },
  client?: SupabaseClient,
): Promise<IssueActivityRow[]> {
  const db = client ?? getAdminClient();
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;

  const { data, error } = await db
    .from("issue_activity")
    .select(
      `id, issue_id, actor_id, action, field, old_value, new_value, metadata, created_at,
       actor:actor_id (id, name)`,
    )
    .eq("issue_id", issueId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[listIssueActivity] Database error:", error.message);
    return [];
  }
  return (data ?? []) as unknown as IssueActivityRow[];
}

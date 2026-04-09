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
  issue_number: number;
  execution_type: string;
  ai_executable: boolean;
  duplicate_of_id: string | null;
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

const ISSUE_SELECT = `
  id, project_id, title, description, type, status, priority, component, severity,
  labels, assigned_to, reporter_name, reporter_email, source, userback_id, source_url,
  issue_number, execution_type, ai_executable, duplicate_of_id,
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
    query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }

  // Sort by priority (urgent first) then created_at DESC
  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error || !data) return [];

  // Sort by priority in JS since Supabase can't do custom enum ordering
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

  if (error || !data) return null;
  return data as unknown as IssueRow;
}

/**
 * Get issue counts per status for a project.
 */
export async function getIssueCounts(
  projectId: string,
  client?: SupabaseClient,
): Promise<{
  backlog: number;
  todo: number;
  in_progress: number;
  done: number;
  cancelled: number;
}> {
  const db = client ?? getAdminClient();
  const statuses = ["backlog", "todo", "in_progress", "done", "cancelled"] as const;
  const counts: Record<string, number> = {
    backlog: 0,
    todo: 0,
    in_progress: 0,
    done: 0,
    cancelled: 0,
  };

  // Single query: fetch all issues with only status, then count in JS
  const { data, error } = await db
    .from("issues")
    .select("status")
    .eq("project_id", projectId)
    .in("status", [...statuses]);

  if (error || !data)
    return counts as {
      backlog: number;
      todo: number;
      in_progress: number;
      done: number;
      cancelled: number;
    };

  for (const row of data) {
    if (row.status in counts) {
      counts[row.status]++;
    }
  }

  return counts as {
    backlog: number;
    todo: number;
    in_progress: number;
    done: number;
    cancelled: number;
  };
}

/**
 * List comments for an issue, sorted by created_at ASC.
 */
export async function listIssueComments(
  issueId: string,
  client?: SupabaseClient,
): Promise<IssueCommentRow[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("issue_comments")
    .select(
      `id, issue_id, author_id, body, created_at, updated_at,
       author:author_id (id, name)`,
    )
    .eq("issue_id", issueId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as unknown as IssueCommentRow[];
}

/**
 * List activity for an issue, sorted by created_at DESC.
 */
export async function listIssueActivity(
  issueId: string,
  client?: SupabaseClient,
): Promise<IssueActivityRow[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("issue_activity")
    .select(
      `id, issue_id, actor_id, action, field, old_value, new_value, metadata, created_at,
       actor:actor_id (id, name)`,
    )
    .eq("issue_id", issueId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as IssueActivityRow[];
}

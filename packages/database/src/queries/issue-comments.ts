import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export interface IssueCommentRow {
  id: string;
  issue_id: string;
  author_id: string;
  author: { id: string; full_name: string } | null;
  body: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get a single comment by ID, scoped to an issue.
 */
export async function getCommentById(
  commentId: string,
  issueId: string,
  client?: SupabaseClient,
): Promise<{ id: string; author_id: string } | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("issue_comments")
    .select("id, author_id")
    .eq("id", commentId)
    .eq("issue_id", issueId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
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
       author:author_id (id, full_name)`,
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

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export interface IssueAttachmentRow {
  id: string;
  issue_id: string;
  type: string; // "screenshot" | "video" | "attachment"
  storage_path: string;
  original_url: string | null;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

const ATTACHMENT_SELECT = `
  id, issue_id, type, storage_path, original_url,
  file_name, mime_type, file_size, width, height, created_at
` as const;

/**
 * Get the first screenshot attachment for each issue in a batch.
 * Returns a map of issue_id -> storage_path.
 */
export async function getIssueThumbnails(
  issueIds: string[],
  client?: SupabaseClient,
): Promise<Map<string, string>> {
  if (issueIds.length === 0) return new Map();
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("issue_attachments")
    .select("issue_id, storage_path")
    .in("issue_id", issueIds)
    .eq("type", "screenshot")
    .order("created_at", { ascending: true });

  if (error || !data) return new Map();

  // Keep only the first screenshot per issue
  const map = new Map<string, string>();
  for (const row of data) {
    if (!map.has(row.issue_id)) {
      map.set(row.issue_id, row.storage_path);
    }
  }
  return map;
}

/**
 * List all attachments for a given issue.
 */
export async function listIssueAttachments(
  issueId: string,
  client?: SupabaseClient,
): Promise<IssueAttachmentRow[]> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("issue_attachments")
    .select(ATTACHMENT_SELECT)
    .eq("issue_id", issueId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[listIssueAttachments] Database error:", error.message);
    return [];
  }
  return (data ?? []) as unknown as IssueAttachmentRow[];
}

/**
 * Get issue IDs that already have attachments (for dedup in backfill).
 */
export async function getIssueIdsWithAttachments(
  issueIds: string[],
  client?: SupabaseClient,
): Promise<Set<string>> {
  if (issueIds.length === 0) return new Set();
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("issue_attachments")
    .select("issue_id")
    .in("issue_id", issueIds);

  if (error) {
    console.error("[getIssueIdsWithAttachments] Database error:", error.message);
    return new Set();
  }
  return new Set((data ?? []).map((a) => a.issue_id));
}

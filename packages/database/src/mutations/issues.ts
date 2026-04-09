import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";
import { ISSUE_SELECT, type IssueRow, type IssueCommentRow } from "../queries/issues";

export interface InsertIssueData {
  project_id: string;
  title: string;
  description?: string | null;
  type?: string;
  status?: string;
  priority?: string;
  component?: string | null;
  severity?: string | null;
  labels?: string[];
  assigned_to?: string | null;
  reporter_name?: string | null;
  reporter_email?: string | null;
  source?: string;
  userback_id?: string | null;
  source_url?: string | null;
  source_metadata?: Record<string, unknown>;
  ai_classification?: Record<string, unknown>;
  ai_classified_at?: string | null;
  duplicate_of_id?: string | null;
  similarity_score?: number | null;
  execution_type?: string;
  ai_context?: Record<string, unknown>;
  ai_result?: Record<string, unknown>;
  ai_executable?: boolean;
}

export interface UpdateIssueData {
  title?: string;
  description?: string | null;
  type?: string;
  status?: string;
  priority?: string;
  component?: string | null;
  severity?: string | null;
  labels?: string[];
  assigned_to?: string | null;
  reporter_name?: string | null;
  reporter_email?: string | null;
  source_url?: string | null;
  ai_classification?: Record<string, unknown>;
  ai_classified_at?: string | null;
  duplicate_of_id?: string | null;
  similarity_score?: number | null;
  execution_type?: string;
  ai_context?: Record<string, unknown>;
  ai_result?: Record<string, unknown>;
  ai_executable?: boolean;
  closed_at?: string | null;
}

/**
 * Insert a new issue with atomic issue_number via next_issue_number() SQL function.
 * No race conditions: the function uses INSERT ... ON CONFLICT DO UPDATE in a single statement.
 */
export async function insertIssue(
  data: InsertIssueData,
  client?: SupabaseClient,
): Promise<IssueRow> {
  const db = client ?? getAdminClient();

  // Atomically get next issue number via SQL function
  const { data: issueNumber, error: seqError } = await db.rpc("next_issue_number", {
    p_project_id: data.project_id,
  });

  if (seqError || issueNumber == null) {
    throw new Error(`Failed to get issue number: ${seqError?.message}`);
  }

  const { data: issue, error } = await db
    .from("issues")
    .insert({
      ...data,
      issue_number: issueNumber,
    })
    .select(ISSUE_SELECT)
    .single();

  if (error) throw new Error(`Failed to insert issue: ${error.message}`);
  return issue as unknown as IssueRow;
}

/**
 * Update an issue. Only provided fields are changed.
 */
export async function updateIssue(
  id: string,
  data: UpdateIssueData,
  client?: SupabaseClient,
): Promise<IssueRow> {
  const db = client ?? getAdminClient();
  const { data: issue, error } = await db
    .from("issues")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(ISSUE_SELECT)
    .single();

  if (error) throw new Error(`Failed to update issue: ${error.message}`);
  return issue as unknown as IssueRow;
}

/**
 * Upsert Userback issues: insert new ones (with issue_number), update existing ones.
 * Returns stats: { imported, updated, skipped }.
 */
export async function upsertUserbackIssues(
  items: InsertIssueData[],
  existingMap: Map<string, string>,
  client?: SupabaseClient,
): Promise<{
  imported: string[];
  importedMap: Map<string, string>; // userback_id → issue_id (for new items)
  updated: number;
  skipped: number;
  errors: string[];
}> {
  const db = client ?? getAdminClient();
  const importedIds: string[] = [];
  const importedMap = new Map<string, string>();
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of items) {
    const existingId = item.userback_id ? existingMap.get(item.userback_id) : undefined;

    if (existingId) {
      // Update existing issue (don't touch issue_number, type, priority — those came from Userback mapping)
      const { error } = await db
        .from("issues")
        .update({
          title: item.title,
          description: item.description,
          status: item.status,
          reporter_email: item.reporter_email,
          reporter_name: item.reporter_name,
          source_url: item.source_url,
          source_metadata: item.source_metadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingId);

      if (error) {
        const msg = `Update ${item.userback_id}: ${error.message}`;
        console.error(`[upsertUserbackIssues] ${msg}`);
        errors.push(msg);
        skipped++;
      } else {
        updated++;
      }
    } else {
      // Insert new issue with atomic issue_number
      try {
        const issue = await insertIssue(item, db);
        importedIds.push(issue.id);
        if (item.userback_id) {
          importedMap.set(item.userback_id, issue.id);
        }
      } catch (err) {
        const msg = `Insert ${item.userback_id}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(`[upsertUserbackIssues] ${msg}`);
        errors.push(msg);
        skipped++;
      }
    }
  }

  return { imported: importedIds, importedMap, updated, skipped, errors };
}

/**
 * Delete an issue (cascade deletes comments and activity).
 */
export async function deleteIssue(id: string, client?: SupabaseClient): Promise<void> {
  const db = client ?? getAdminClient();
  const { error } = await db.from("issues").delete().eq("id", id);

  if (error) throw new Error(`Failed to delete issue: ${error.message}`);
}

/**
 * Insert a comment on an issue.
 */
export async function insertComment(
  data: { issue_id: string; author_id: string; body: string },
  client?: SupabaseClient,
): Promise<IssueCommentRow> {
  const db = client ?? getAdminClient();
  const { data: comment, error } = await db
    .from("issue_comments")
    .insert(data)
    .select(
      `id, issue_id, author_id, body, created_at, updated_at,
       author:author_id (id, full_name)`,
    )
    .single();

  if (error) throw new Error(`Failed to insert comment: ${error.message}`);
  return comment as unknown as IssueCommentRow;
}

/**
 * Update a comment body.
 */
export async function updateComment(
  id: string,
  body: string,
  client?: SupabaseClient,
): Promise<IssueCommentRow> {
  const db = client ?? getAdminClient();
  const { data: comment, error } = await db
    .from("issue_comments")
    .update({ body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(
      `id, issue_id, author_id, body, created_at, updated_at,
       author:author_id (id, full_name)`,
    )
    .single();

  if (error) throw new Error(`Failed to update comment: ${error.message}`);
  return comment as unknown as IssueCommentRow;
}

/**
 * Delete a comment by ID.
 */
export async function deleteComment(id: string, client?: SupabaseClient): Promise<void> {
  const db = client ?? getAdminClient();
  const { error } = await db.from("issue_comments").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete comment: ${error.message}`);
}

/**
 * Insert an activity log entry for an issue.
 */
export async function insertActivity(
  data: {
    issue_id: string;
    actor_id?: string;
    action: string;
    field?: string;
    old_value?: string;
    new_value?: string;
    metadata?: Record<string, unknown>;
  },
  client?: SupabaseClient,
): Promise<void> {
  const db = client ?? getAdminClient();
  const { error } = await db.from("issue_activity").insert(data);

  if (error) throw new Error(`Failed to insert activity: ${error.message}`);
}

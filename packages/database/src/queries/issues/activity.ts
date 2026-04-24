import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

export interface IssueActivityRow {
  id: string;
  issue_id: string;
  actor_id: string | null;
  actor: { id: string; full_name: string } | null;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
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
       actor:actor_id (id, full_name)`,
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

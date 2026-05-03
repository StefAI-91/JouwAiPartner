import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import { UNASSIGNED_SENTINEL } from "../../constants/issues";

// Re-export so callers that import from queries/issues keep working.
export { UNASSIGNED_SENTINEL };

export interface IssueRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  client_title: string | null;
  client_description: string | null;
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
  // CC-001 PM-review-gate kolommen — gevuld na decline / convert.
  decline_reason: string | null;
  converted_to_question_id: string | null;
}

export const ISSUE_SELECT = `
  id, project_id, title, description, client_title, client_description,
  type, status, priority, component, severity,
  labels, assigned_to, reporter_name, reporter_email, source, userback_id, source_url, source_metadata,
  issue_number, execution_type, ai_executable, ai_context, ai_result, duplicate_of_id, ai_classification,
  created_at, updated_at, closed_at,
  decline_reason, converted_to_question_id,
  assigned_person:assigned_to (id, full_name)
` as const;

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

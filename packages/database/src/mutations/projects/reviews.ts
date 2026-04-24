import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import type { ProjectReviewRow } from "../../queries/projects/reviews";

export interface InsertProjectReviewData {
  project_id: string;
  generated_by?: string | null;
  total_issues: number;
  issues_by_status: Record<string, number>;
  issues_by_priority: Record<string, number>;
  issues_by_type: Record<string, number>;
  avg_resolution_days: number | null;
  health_score: number;
  health_label: string;
  summary: string;
  frontend_summary?: string | null;
  backend_summary?: string | null;
  patterns: unknown[];
  risks: unknown[];
  action_items: unknown[];
  model_used?: string;
  input_token_count?: number;
}

/**
 * Save a new project review to the database.
 */
export async function saveProjectReview(
  data: InsertProjectReviewData,
  client?: SupabaseClient,
): Promise<ProjectReviewRow> {
  const db = client ?? getAdminClient();

  const { data: review, error } = await db
    .from("project_reviews")
    .insert(data)
    .select(
      `id, project_id, generated_by, total_issues,
       issues_by_status, issues_by_priority, issues_by_type, avg_resolution_days,
       health_score, health_label, summary, frontend_summary, backend_summary,
       patterns, risks, action_items,
       model_used, created_at`,
    )
    .single();

  if (error) throw new Error(`Failed to save project review: ${error.message}`);
  return review as unknown as ProjectReviewRow;
}

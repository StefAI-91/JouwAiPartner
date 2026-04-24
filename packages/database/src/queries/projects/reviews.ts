import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

export interface ProjectReviewRow {
  id: string;
  project_id: string;
  generated_by: string | null;
  total_issues: number;
  issues_by_status: Record<string, number>;
  issues_by_priority: Record<string, number>;
  issues_by_type: Record<string, number>;
  avg_resolution_days: number | null;
  health_score: number;
  health_label: string;
  summary: string;
  patterns: Array<{
    title: string;
    description: string;
    affected_issues: number[];
    severity: string;
  }>;
  risks: Array<{
    title: string;
    description: string;
    affected_issues: number[];
    urgency: string;
  }>;
  action_items: Array<{
    title: string;
    description: string;
    priority: string;
    related_issues: number[];
    effort: string;
  }>;
  frontend_summary: string | null;
  backend_summary: string | null;
  model_used: string;
  created_at: string;
}

const REVIEW_SELECT = `
  id, project_id, generated_by, total_issues,
  issues_by_status, issues_by_priority, issues_by_type, avg_resolution_days,
  health_score, health_label, summary, frontend_summary, backend_summary,
  patterns, risks, action_items,
  model_used, created_at
` as const;

/**
 * Get the latest review for a project.
 */
export async function getLatestProjectReview(
  projectId: string,
  client?: SupabaseClient,
): Promise<ProjectReviewRow | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("project_reviews")
    .select(REVIEW_SELECT)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getLatestProjectReview] Database error:", error.message);
    return null;
  }
  return data as unknown as ProjectReviewRow | null;
}

/**
 * List all reviews for a project (for history/trends).
 */
export async function listProjectReviews(
  projectId: string,
  params?: { limit?: number },
  client?: SupabaseClient,
): Promise<ProjectReviewRow[]> {
  const db = client ?? getAdminClient();
  const limit = params?.limit ?? 10;

  const { data, error } = await db
    .from("project_reviews")
    .select(REVIEW_SELECT)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listProjectReviews] Database error:", error.message);
    return [];
  }
  return (data ?? []) as unknown as ProjectReviewRow[];
}

/**
 * Get the health score trend by comparing the two most recent reviews.
 */
export async function getHealthTrend(
  projectId: string,
  client?: SupabaseClient,
): Promise<{ current: number; previous: number | null; delta: number | null } | null> {
  const reviews = await listProjectReviews(projectId, { limit: 2 }, client);

  if (reviews.length === 0) return null;

  const current = reviews[0].health_score;
  const previous = reviews.length >= 2 ? reviews[1].health_score : null;
  const delta = previous !== null ? current - previous : null;

  return { current, previous, delta };
}

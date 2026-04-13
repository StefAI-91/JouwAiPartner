"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import { getAdminClient } from "@repo/database/supabase/admin";
import { listIssues } from "@repo/database/queries/issues";
import { getProjectById } from "@repo/database/queries/projects";
import { saveProjectReview } from "@repo/database/mutations/project-reviews";
import { runIssueReviewer, type IssueForReview } from "@repo/ai/agents/issue-reviewer";
import { getAuthenticatedUser, isAuthBypassed } from "@repo/auth/helpers";

const generateReviewSchema = z.object({
  projectId: z.string().uuid(),
});

/**
 * Generate an AI review of all issues for a project.
 * Fetches all issues, runs the issue-reviewer agent, and saves the result.
 */
export async function generateProjectReview(
  input: z.input<typeof generateReviewSchema>,
): Promise<{ success: true; reviewId: string } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = generateReviewSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldig project ID" };

  try {
    // Use admin client in bypass mode (no user session), otherwise user-scoped client
    const db = isAuthBypassed() ? getAdminClient() : await createClient();

    // Fetch all issues for the project (up to 500)
    const issues = await listIssues({ projectId: parsed.data.projectId, limit: 500 }, db);

    if (issues.length === 0) {
      return { error: "Geen issues gevonden voor dit project" };
    }

    // Get project name
    const project = await getProjectById(parsed.data.projectId, db);
    const projectName = project?.name ?? "Onbekend project";

    // Prepare issues for the AI agent
    const now = Date.now();
    const issuesForReview: IssueForReview[] = issues.map((i) => ({
      issue_number: i.issue_number,
      title: i.title,
      description: i.description,
      type: i.type,
      status: i.status,
      priority: i.priority,
      component: i.component,
      severity: i.severity,
      labels: i.labels,
      assigned_to_name: i.assigned_person?.full_name ?? null,
      source: i.source,
      created_at: i.created_at,
      updated_at: i.updated_at,
      closed_at: i.closed_at,
      days_open: i.closed_at
        ? Math.floor(
            (new Date(i.closed_at).getTime() - new Date(i.created_at).getTime()) / 86400000,
          )
        : Math.floor((now - new Date(i.created_at).getTime()) / 86400000),
    }));

    // Run AI analysis
    const result = await runIssueReviewer(projectName, issuesForReview);

    // Calculate metrics snapshot
    const statusCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    let totalResolutionDays = 0;
    let closedCount = 0;

    for (const i of issues) {
      statusCounts[i.status] = (statusCounts[i.status] ?? 0) + 1;
      priorityCounts[i.priority] = (priorityCounts[i.priority] ?? 0) + 1;
      typeCounts[i.type] = (typeCounts[i.type] ?? 0) + 1;

      if (i.closed_at) {
        const days =
          (new Date(i.closed_at).getTime() - new Date(i.created_at).getTime()) / 86400000;
        totalResolutionDays += days;
        closedCount++;
      }
    }

    const avgResolutionDays =
      closedCount > 0 ? Math.round((totalResolutionDays / closedCount) * 10) / 10 : null;

    // Save to database
    const review = await saveProjectReview({
      project_id: parsed.data.projectId,
      generated_by: user.id,
      total_issues: issues.length,
      issues_by_status: statusCounts,
      issues_by_priority: priorityCounts,
      issues_by_type: typeCounts,
      avg_resolution_days: avgResolutionDays,
      health_score: result.health_score,
      health_label: result.health_label,
      summary: result.summary,
      frontend_summary: result.frontend_summary,
      backend_summary: result.backend_summary,
      patterns: result.patterns,
      risks: result.risks,
      action_items: result.action_items,
    });

    revalidatePath("/review");
    revalidatePath("/");
    return { success: true, reviewId: review.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generateProjectReview] Full error:", message, err);
    return { error: `Review generatie mislukt: ${message}` };
  }
}

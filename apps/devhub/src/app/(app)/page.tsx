import { listAccessibleProjects } from "@repo/database/queries/project-access";
import { getLatestProjectReview, getHealthTrend } from "@repo/database/queries/project-reviews";
import { getIssueCounts, countCriticalUnassigned } from "@repo/database/queries/issues";
import { getAuthenticatedUser, createPageClient } from "@repo/auth/helpers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { HealthHero } from "@/components/dashboard/health-hero";
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics";
import { AreaSummaries } from "@/components/dashboard/area-summaries";
import { ActionItemsList } from "@/components/review/action-items-list";
import { LayoutDashboard } from "lucide-react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const params = await searchParams;
  const projectId = params.project;

  const [user, supabase] = await Promise.all([getAuthenticatedUser(), createPageClient()]);
  if (!user) redirect("/login");

  const projects = await listAccessibleProjects(user.id, supabase);

  if (!projectId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <LayoutDashboard className="size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Selecteer een project om het dashboard te bekijken.
        </p>
      </div>
    );
  }

  const hasAccess = projects.some((p) => p.id === projectId);
  if (!hasAccess) notFound();

  const [review, counts, criticalUnassigned, healthTrend] = await Promise.all([
    getLatestProjectReview(projectId, supabase),
    getIssueCounts(projectId, supabase),
    countCriticalUnassigned(projectId, supabase),
    getHealthTrend(projectId, supabase),
  ]);

  const project = projects.find((p) => p.id === projectId);
  const totalOpen = counts.triage + counts.backlog + counts.todo + counts.in_progress;
  const totalAll = totalOpen + counts.done + counts.cancelled;

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <DashboardHeader
        projectId={projectId}
        projectName={project?.name ?? "dit project"}
        lastReviewAt={review?.created_at ?? null}
      />

      {/* Health Score Hero */}
      {review ? (
        <HealthHero
          score={review.health_score}
          label={review.health_label}
          summary={review.summary}
          trend={healthTrend}
        />
      ) : (
        <div className="rounded-lg border border-dashed bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nog geen AI review beschikbaar. Gebruik de knop hierboven om een analyse te genereren.
          </p>
        </div>
      )}

      {/* Metric Cards */}
      <DashboardMetrics
        openCount={totalOpen}
        totalCount={totalAll}
        criticalUnassignedCount={criticalUnassigned}
        triageCount={counts.triage}
      />

      {/* Area Summaries: Frontend + Backend */}
      {review && (
        <AreaSummaries
          frontendSummary={review.frontend_summary}
          backendSummary={review.backend_summary}
        />
      )}

      {/* Aanbevolen Focus */}
      {review && review.action_items.length > 0 && (
        <ActionItemsList actionItems={review.action_items} projectId={projectId} />
      )}
    </div>
  );
}

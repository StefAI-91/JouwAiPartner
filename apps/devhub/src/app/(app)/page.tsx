import { listAccessibleProjects } from "@repo/database/queries/projects/access";
import { getLatestProjectReview, getHealthTrend } from "@repo/database/queries/projects/reviews";
import {
  getIssueCounts,
  countCriticalUnassigned,
  getWeeklyIssueIntake,
  getDashboardThisWeek,
} from "@repo/database/queries/issues";
import { listTeamMembers } from "@repo/database/queries/team";
import { getAuthenticatedUser, createPageClient } from "@repo/auth/helpers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { HealthHero } from "@/components/dashboard/health-hero";
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics";
import { IssuesIntakeChart } from "@/components/dashboard/issues-intake-chart";
import { AreaSummaries } from "@/components/dashboard/area-summaries";
import { ThisWeekSection } from "@/components/dashboard/this-week-section";
import { ActionItemsList } from "@/components/review/action-items-list";
import { CountSeeder } from "@/components/layout/count-seeder";
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

  const [review, counts, criticalUnassigned, healthTrend, weeklyIntake, thisWeek, people] =
    await Promise.all([
      getLatestProjectReview(projectId, supabase),
      getIssueCounts(projectId, supabase),
      countCriticalUnassigned(projectId, supabase),
      getHealthTrend(projectId, supabase),
      getWeeklyIssueIntake(projectId, 12, supabase),
      getDashboardThisWeek(projectId, supabase),
      listTeamMembers(supabase),
    ]);

  const project = projects.find((p) => p.id === projectId);
  const totalOpen = counts.triage + counts.backlog + counts.todo + counts.in_progress;
  const totalAll = totalOpen + counts.done + counts.cancelled;

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Hand the sidebar badges the counts we already fetched so they don't
          have to round-trip a second time on the client. */}
      <CountSeeder projectId={projectId} counts={counts} />
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

      {/* Deze week — team-focus: urgent + actief */}
      <ThisWeekSection urgent={thisWeek.urgent} active={thisWeek.active} people={people} />

      {/* Weekly intake trend */}
      <IssuesIntakeChart data={weeklyIntake} />

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

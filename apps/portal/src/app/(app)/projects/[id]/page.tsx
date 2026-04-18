import { createPageClient } from "@repo/auth/helpers";
import { getProjectIssueCounts, listRecentProjectIssues } from "@repo/database/queries/portal";
import { getLatestSummary } from "@repo/database/queries/summaries";
import { IssueMetrics } from "@/components/projects/issue-metrics";
import { ProjectSummary } from "@/components/projects/project-summary";
import { RecentActivity } from "@/components/projects/recent-activity";

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createPageClient();

  const [contextSummary, briefingSummary, issueCounts, recentIssues] = await Promise.all([
    getLatestSummary("project", id, "context", supabase),
    getLatestSummary("project", id, "briefing", supabase),
    getProjectIssueCounts(id, supabase),
    listRecentProjectIssues(id, 10, supabase),
  ]);

  const summary = contextSummary ?? briefingSummary;

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <IssueMetrics counts={issueCounts} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProjectSummary
            summary={summary ? { content: summary.content, created_at: summary.created_at } : null}
          />
        </div>
        <div className="lg:col-span-1">
          <RecentActivity projectId={id} issues={recentIssues} />
        </div>
      </div>
    </div>
  );
}

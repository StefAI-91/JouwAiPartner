import { createPageClient } from "@repo/auth/helpers";
import { listIssues, getIssueThumbnails } from "@repo/database/queries/issues";
import { IssueList } from "@/components/issues/issue-list";
import { IssueFilters } from "@/components/issues/issue-filters";

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{
    project?: string;
    status?: string;
    priority?: string;
    type?: string;
    component?: string;
  }>;
}) {
  const params = await searchParams;
  const projectId = params.project;

  if (!projectId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          Selecteer een project om issues te bekijken.
        </p>
      </div>
    );
  }

  const supabase = await createPageClient();

  const issues = await listIssues(
    {
      projectId,
      status: params.status?.split(","),
      priority: params.priority?.split(","),
      type: params.type?.split(","),
      component: params.component?.split(","),
    },
    supabase,
  );

  const thumbnails = await getIssueThumbnails(
    issues.map((i) => i.id),
    supabase,
  );

  return (
    <div className="flex flex-1 flex-col px-4 sm:px-6 lg:px-8">
      <IssueFilters />
      <IssueList issues={issues} thumbnails={thumbnails} />
    </div>
  );
}

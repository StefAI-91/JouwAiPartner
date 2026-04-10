import { createPageClient } from "@repo/auth/helpers";
import { listIssues, getIssueThumbnails, countFilteredIssues } from "@repo/database/queries/issues";
import { IssueList } from "@/components/issues/issue-list";
import { IssueFilters } from "@/components/issues/issue-filters";
import { PaginationControls } from "@/components/issues/pagination-controls";

const PAGE_SIZE = 25;

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{
    project?: string;
    status?: string;
    priority?: string;
    type?: string;
    component?: string;
    page?: string;
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

  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const supabase = await createPageClient();

  const filterParams = {
    projectId,
    status: params.status?.split(","),
    priority: params.priority?.split(","),
    type: params.type?.split(","),
    component: params.component?.split(","),
  };

  const [issues, totalCount] = await Promise.all([
    listIssues({ ...filterParams, limit: PAGE_SIZE, offset }, supabase),
    countFilteredIssues(filterParams, supabase),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const thumbnails = await getIssueThumbnails(
    issues.map((i) => i.id),
    supabase,
  );

  return (
    <div className="flex flex-1 flex-col px-4 sm:px-6 lg:px-8">
      <IssueFilters />
      <IssueList issues={issues} thumbnails={thumbnails} />
      <PaginationControls currentPage={currentPage} totalPages={totalPages} />
    </div>
  );
}

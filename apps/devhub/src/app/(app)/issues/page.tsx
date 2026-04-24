import { z } from "zod";
import { redirect } from "next/navigation";
import { createPageClient, getAuthenticatedUser } from "@repo/auth/helpers";
import { listAccessibleProjectIds } from "@repo/auth/access";
import {
  listIssues,
  countFilteredIssues,
  getIssueCounts,
  ISSUE_SORTS,
} from "@repo/database/queries/issues";
import { getIssueThumbnails } from "@repo/database/queries/issues/attachments";
import { IssueList } from "@/components/issues/issue-list";
import { IssueFilters } from "@/components/issues/issue-filters";
import { PaginationControls } from "@/components/issues/pagination-controls";
import { CountSeeder } from "@/components/layout/count-seeder";

const PAGE_SIZE = 25;

const issueSearchParamsSchema = z.object({
  project: z.string().uuid().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  component: z.string().optional(),
  sort: z.enum(ISSUE_SORTS).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = issueSearchParamsSchema.safeParse(raw);
  const params = parsed.success ? parsed.data : {};
  const projectId = params.project;

  const [user, supabase] = await Promise.all([getAuthenticatedUser(), createPageClient()]);
  if (!user) redirect("/login");

  const accessibleIds = await listAccessibleProjectIds(user.id, supabase);

  if (accessibleIds.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="max-w-md text-center text-sm text-muted-foreground">
          Je hebt nog geen toegang tot projecten. Vraag een admin om je toe te voegen.
        </p>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          Selecteer een project om issues te bekijken.
        </p>
      </div>
    );
  }

  // Members without access to this specific project get the same empty view
  // as members selecting an unknown project — no existence hint.
  if (!accessibleIds.includes(projectId)) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Geen issues gevonden voor dit project.</p>
      </div>
    );
  }

  const currentPage = params.page ?? 1;
  const offset = (currentPage - 1) * PAGE_SIZE;

  const filterParams = {
    projectId,
    status: params.status?.split(","),
    priority: params.priority?.split(","),
    type: params.type?.split(","),
    component: params.component?.split(","),
  };

  const [issues, totalCount, sidebarCounts] = await Promise.all([
    listIssues({ ...filterParams, sort: params.sort, limit: PAGE_SIZE, offset }, supabase),
    countFilteredIssues(filterParams, supabase),
    getIssueCounts(projectId, supabase),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const thumbnails = await getIssueThumbnails(
    issues.map((i) => i.id),
    supabase,
  );

  return (
    <div className="flex flex-1 flex-col px-4 sm:px-6 lg:px-8">
      {/* Seed the sidebar badges from the server so they're correct on first
          paint — avoids the "numbers pop in a second later" lag. */}
      <CountSeeder projectId={projectId} counts={sidebarCounts} />
      <IssueFilters />
      <IssueList issues={issues} thumbnails={thumbnails} />
      <PaginationControls currentPage={currentPage} totalPages={totalPages} />
    </div>
  );
}

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
import { getIssueThumbnails } from "@repo/database/queries/issue-attachments";
import { listTeamMembers } from "@repo/database/queries/team";
import { issueListFilterSchema } from "@repo/database/validations/issues";
import { IssueList } from "@/components/issues/issue-list";
import { IssueFilters } from "@/components/issues/issue-filters";
import { PaginationControls } from "@/components/issues/pagination-controls";
import { CountSeeder } from "@/components/layout/count-seeder";

const PAGE_SIZE = 25;

const issueSearchParamsSchema = issueListFilterSchema.extend({
  project: z.string().uuid().optional(),
  q: z.string().trim().max(200).optional(),
  sort: z.enum(ISSUE_SORTS).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

/**
 * Parse a search query into either an exact issue_number or a text search.
 * Accepts "#464", "464", " 464 ", " #464 " as number lookups — anything with
 * non-digit characters (besides the leading #) goes through ilike on
 * title/description.
 */
function parseSearchQuery(raw: string | undefined): { issueNumber?: number; search?: string } {
  if (!raw) return {};
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const numberMatch = trimmed.match(/^#?(\d+)$/);
  if (numberMatch) {
    const n = Number(numberMatch[1]);
    if (Number.isSafeInteger(n) && n > 0) return { issueNumber: n };
  }
  return { search: trimmed };
}

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const raw = await searchParams;
  // On parse failure, fall back to an empty-params shape by re-parsing `{}` —
  // the schema is lenient (every field is optional/transform-driven), so this
  // always succeeds and produces the same shape as a happy path with no
  // filters. Keeps downstream typing simple.
  const parsed = issueSearchParamsSchema.safeParse(raw);
  const params = parsed.success ? parsed.data : issueSearchParamsSchema.parse({});
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

  const { issueNumber, search } = parseSearchQuery(params.q);

  const filterParams = {
    projectId,
    status: params.status,
    priority: params.priority,
    type: params.type,
    component: params.component,
    assignedTo: params.assignee,
    issueNumber,
    search,
  };

  const [issues, totalCount, sidebarCounts, members] = await Promise.all([
    listIssues({ ...filterParams, sort: params.sort, limit: PAGE_SIZE, offset }, supabase),
    countFilteredIssues(filterParams, supabase),
    getIssueCounts(projectId, supabase),
    listTeamMembers(supabase),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const thumbnails = await getIssueThumbnails(
    issues.map((i) => i.id),
    supabase,
  );

  const people = members.map((m) => ({
    id: m.id,
    name: m.full_name?.trim() || m.email,
  }));

  return (
    <div className="flex flex-1 flex-col px-4 sm:px-6 lg:px-8">
      {/* Seed the sidebar badges from the server so they're correct on first
          paint — avoids the "numbers pop in a second later" lag. */}
      <CountSeeder projectId={projectId} counts={sidebarCounts} />
      <IssueFilters people={people} />
      <IssueList issues={issues} thumbnails={thumbnails} />
      <PaginationControls currentPage={currentPage} totalPages={totalPages} />
    </div>
  );
}

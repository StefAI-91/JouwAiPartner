import { z } from "zod";
import { redirect } from "next/navigation";
import { createPageClient, getAuthenticatedUser } from "@repo/auth/helpers";
import { listAccessibleProjectIds } from "@repo/auth/access";
import {
  listIssues,
  countFilteredIssues,
  getIssueCounts,
  parseSearchQuery,
  ISSUE_SORTS,
} from "@repo/database/queries/issues";
import { getIssueThumbnails } from "@repo/database/queries/issues/attachments";
import { listTeamMembers } from "@repo/database/queries/team";
import { getTopicMembershipForIssues, listTopics } from "@repo/database/queries/topics";
import { issueListFilterSchema } from "@repo/database/validations/issues";
import { IssueList } from "@/features/issues/components/issue-list";
import { IssueFilters } from "@/features/issues/components/issue-filters";
import { PaginationControls } from "@/features/issues/components/pagination-controls";
import { CountSeeder } from "@/components/layout/count-seeder";

const PAGE_SIZE = 25;

const issueSearchParamsSchema = issueListFilterSchema.extend({
  project: z.string().uuid().optional(),
  q: z.string().trim().max(200).optional(),
  sort: z.enum(ISSUE_SORTS).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

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
    topicIds: params.topic,
    ungroupedOnly: params.ungrouped,
    issueNumber,
    search,
  };

  const [issues, totalCount, sidebarCounts, members, projectTopics] = await Promise.all([
    listIssues({ ...filterParams, sort: params.sort, limit: PAGE_SIZE, offset }, supabase),
    countFilteredIssues(filterParams, supabase),
    getIssueCounts(projectId, supabase),
    listTeamMembers(supabase),
    listTopics(projectId, {}, supabase),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const issueIds = issues.map((i) => i.id);
  const [thumbnails, topicMembership] = await Promise.all([
    getIssueThumbnails(issueIds, supabase),
    getTopicMembershipForIssues(issueIds, supabase),
  ]);

  const people = members.map((m) => ({
    id: m.id,
    name: m.full_name?.trim() || m.email,
  }));

  // De filter-dropdown heeft `{value,label}`, de TopicPill heeft `{id,title}` —
  // verschillende vormen voor verschillende consumers maar één bron.
  const topicsForPill = projectTopics.map((t) => ({ id: t.id, title: t.title }));
  const topicFilterOptions = projectTopics.map((t) => ({ id: t.id, label: t.title }));

  return (
    <div className="flex flex-1 flex-col px-4 sm:px-6 lg:px-8">
      {/* Seed the sidebar badges from the server so they're correct on first
          paint — avoids the "numbers pop in a second later" lag. */}
      <CountSeeder projectId={projectId} counts={sidebarCounts} />
      <IssueFilters people={people} topics={topicFilterOptions} />
      <IssueList
        issues={issues}
        thumbnails={thumbnails}
        topicMembership={topicMembership}
        topics={topicsForPill}
      />
      <PaginationControls currentPage={currentPage} totalPages={totalPages} />
    </div>
  );
}

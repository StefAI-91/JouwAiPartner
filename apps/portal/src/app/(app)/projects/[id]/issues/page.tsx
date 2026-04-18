import { createPageClient } from "@repo/auth/helpers";
import { listPortalIssues, type PortalStatusFilter } from "@repo/database/queries/portal";
import { IssueList } from "@/components/issues/issue-list";
import { IssueStatusFilter } from "@/components/issues/issue-status-filter";

const VALID_FILTERS: PortalStatusFilter[] = [
  "ontvangen",
  "ingepland",
  "in_behandeling",
  "afgerond",
];

function parseFilter(raw: string | undefined): PortalStatusFilter | null {
  if (!raw) return null;
  return VALID_FILTERS.includes(raw as PortalStatusFilter) ? (raw as PortalStatusFilter) : null;
}

export default async function ProjectIssuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const filter = parseFilter(query.status);

  const supabase = await createPageClient();
  const issues = await listPortalIssues(id, supabase, filter ? { status: filter } : undefined);

  return (
    <div className="flex flex-1 flex-col gap-5 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Issues</h2>
          <p className="text-sm text-muted-foreground">
            Alle meldingen, wensen en vragen voor dit project.
          </p>
        </div>
      </div>
      <IssueStatusFilter projectId={id} active={filter} />
      <IssueList projectId={id} issues={issues} />
    </div>
  );
}

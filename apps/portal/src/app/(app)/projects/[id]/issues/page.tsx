import { createPageClient } from "@repo/auth/helpers";
import { ISSUE_TYPES, type IssueType } from "@repo/database/constants/issues";
import { getProjectIssueCounts, listPortalIssues } from "@repo/database/queries/portal";
import { BucketDashboard } from "@/components/issues/bucket-dashboard";
import { TypeFilter } from "@/components/issues/type-filter";

const VALID_TYPE_KEYS = new Set<string>(ISSUE_TYPES);

function parseType(raw: string | undefined): IssueType | null {
  if (!raw) return null;
  return VALID_TYPE_KEYS.has(raw) ? (raw as IssueType) : null;
}

export default async function ProjectIssuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const type = parseType(query.type);

  const supabase = await createPageClient();

  // "Mijn feedback" toont alleen wat de klant-PM zelf heeft ingebracht via het
  // portal-formulier (`source='portal'`). Userback (eindgebruikers) en JAIP-
  // interne tickets landen via topic-curatie in de Roadmap, niet als ruwe
  // ticket-stroom in deze view.
  const filters = {
    sourceGroup: "portal_pm" as const,
    ...(type ? { types: [type] } : {}),
  };

  const [issues, counts] = await Promise.all([
    listPortalIssues(id, supabase, filters),
    getProjectIssueCounts(id, supabase, filters),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-5 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Mijn feedback</h2>
          <p className="text-sm text-muted-foreground">
            Wat jullie hebben gemeld en de status ervan.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <TypeFilter projectId={id} active={type} source="portal_pm" />
      </div>
      <BucketDashboard projectId={id} issues={issues} counts={counts} />
    </div>
  );
}

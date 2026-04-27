import { createPageClient } from "@repo/auth/helpers";
import {
  ISSUE_TYPES,
  PORTAL_SOURCE_GROUPS,
  type IssueType,
  type PortalSourceGroupKey,
} from "@repo/database/constants/issues";
import { getProjectIssueCounts, listPortalIssues } from "@repo/database/queries/portal";
import { BucketDashboard } from "@/components/issues/bucket-dashboard";
import { SourceSwitch } from "@/components/issues/source-switch";
import { TypeFilter } from "@/components/issues/type-filter";

const VALID_SOURCE_KEYS = new Set<string>(PORTAL_SOURCE_GROUPS.map((g) => g.key));
const VALID_TYPE_KEYS = new Set<string>(ISSUE_TYPES);

function parseSourceGroup(raw: string | undefined): PortalSourceGroupKey | null {
  if (!raw) return null;
  return VALID_SOURCE_KEYS.has(raw) ? (raw as PortalSourceGroupKey) : null;
}

function parseType(raw: string | undefined): IssueType | null {
  if (!raw) return null;
  return VALID_TYPE_KEYS.has(raw) ? (raw as IssueType) : null;
}

export default async function ProjectIssuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ source?: string; type?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const sourceGroup = parseSourceGroup(query.source);
  const type = parseType(query.type);

  const supabase = await createPageClient();

  // Bucket-view toont alle 4 statussen tegelijk; pagineren gebeurt later per
  // bucket als dat nodig blijkt. Voor nu één DB-call die de actieve filters
  // (source/type) toepast — counts gebruiken dezelfde filters zodat de
  // bucket-headers en de cards niet uit elkaar lopen (BUCKET-V1-04).
  const filters = {
    ...(sourceGroup ? { sourceGroup } : {}),
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
          <h2 className="text-lg font-semibold text-foreground">Issues</h2>
          <p className="text-sm text-muted-foreground">
            Alle meldingen, wensen en vragen voor dit project.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <SourceSwitch projectId={id} active={sourceGroup} type={type} />
        <TypeFilter projectId={id} active={type} source={sourceGroup} />
      </div>
      <BucketDashboard projectId={id} issues={issues} counts={counts} />
    </div>
  );
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import { cutoffIsoFromDaysBack, type PaginatedResult } from "./internals";

export interface ProjectActivityEvent {
  issue_id: string;
  issue_number: number;
  issue_title: string;
  actor_name: string | null;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface ProjectContextReport {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  deadline: string | null;
  description: string | null;
  organization: { id: string; name: string } | null;
  owner_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  summaries: {
    context: string | null;
    briefing: string | null;
  };
}

/**
 * Haal alle activity-events op voor een project binnen een tijdvenster.
 * Eerst worden de issue-IDs van het project verzameld, vervolgens wordt
 * activity gefilterd op die IDs én op `created_at >= cutoff`. Twee queries,
 * maar explicieter en betrouwbaarder dan nested filtering via embedded
 * resources — en schaalbaar tot duizenden issues per project.
 */
export async function getProjectActivityForReport(
  projectId: string,
  daysBack: number,
  filtersOrClient?:
    | SupabaseClient
    | {
        limit?: number;
        offset?: number;
      },
  maybeClient?: SupabaseClient,
): Promise<PaginatedResult<ProjectActivityEvent>> {
  const isClient = (v: unknown): v is SupabaseClient =>
    !!v && typeof v === "object" && "from" in (v as object);

  const filters = isClient(filtersOrClient) ? undefined : filtersOrClient;
  const client = isClient(filtersOrClient) ? filtersOrClient : maybeClient;

  const db = client ?? getAdminClient();
  const cutoff = cutoffIsoFromDaysBack(daysBack);
  const limit = Math.min(filters?.limit ?? 150, 500);
  const offset = Math.max(filters?.offset ?? 0, 0);

  const { data: issueRows, error: issuesError } = await db
    .from("issues")
    .select("id, issue_number, title")
    .eq("project_id", projectId);

  if (issuesError) {
    console.error("[getProjectActivityForReport] issues error:", issuesError.message);
    return { rows: [], totalCount: 0 };
  }
  if (!issueRows || issueRows.length === 0) return { rows: [], totalCount: 0 };

  const issueMap = new Map<string, { issue_number: number; title: string }>();
  for (const row of issueRows as { id: string; issue_number: number; title: string }[]) {
    issueMap.set(row.id, { issue_number: row.issue_number, title: row.title });
  }
  const issueIds = [...issueMap.keys()];

  const {
    data: activityRows,
    error: activityError,
    count,
  } = await db
    .from("issue_activity")
    .select(
      "issue_id, action, field, old_value, new_value, created_at, actor:actor_id (id, full_name)",
      { count: "exact" },
    )
    .in("issue_id", issueIds)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (activityError) {
    console.error("[getProjectActivityForReport] activity error:", activityError.message);
    return { rows: [], totalCount: 0 };
  }

  const rows = (activityRows ?? []) as unknown as Array<{
    issue_id: string;
    action: string;
    field: string | null;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
    actor: { id: string; full_name: string | null } | null;
  }>;

  const mapped = rows.flatMap((row): ProjectActivityEvent[] => {
    const issueMeta = issueMap.get(row.issue_id);
    if (!issueMeta) return [];
    return [
      {
        issue_id: row.issue_id,
        issue_number: issueMeta.issue_number,
        issue_title: issueMeta.title,
        actor_name: row.actor?.full_name ?? null,
        action: row.action,
        field: row.field,
        old_value: row.old_value,
        new_value: row.new_value,
        created_at: row.created_at,
      },
    ];
  });

  return { rows: mapped, totalCount: count ?? mapped.length };
}

/**
 * Haal project-meta, organisatie, owner, contactpersoon en de laatste
 * `context` en `briefing` summaries op. De summaries komen uit de bestaande
 * project-summarizer pipeline en geven de AI een beknopte projectbeschrijving
 * + forward-looking briefing mee voor rapportage-context.
 */
export async function getProjectContextForReport(
  projectId: string,
  client?: SupabaseClient,
): Promise<ProjectContextReport | null> {
  const db = client ?? getAdminClient();

  const { data: projectRow, error: projectError } = await db
    .from("projects")
    .select(
      `id, name, status, start_date, deadline, description,
       organization:organization_id (id, name),
       owner:owner_id (id, name),
       contact:contact_person_id (id, name, email)`,
    )
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    console.error("[getProjectContextForReport] project error:", projectError.message);
    return null;
  }
  if (!projectRow) return null;

  const project = projectRow as unknown as {
    id: string;
    name: string;
    status: string | null;
    start_date: string | null;
    deadline: string | null;
    description: string | null;
    organization: { id: string; name: string } | null;
    owner: { id: string; name: string } | null;
    contact: { id: string; name: string; email: string | null } | null;
  };

  const [contextSummary, briefingSummary] = await Promise.all([
    db
      .from("summaries")
      .select("content")
      .eq("entity_type", "project")
      .eq("entity_id", projectId)
      .eq("summary_type", "context")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("summaries")
      .select("content")
      .eq("entity_type", "project")
      .eq("entity_id", projectId)
      .eq("summary_type", "briefing")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    id: project.id,
    name: project.name,
    status: project.status ?? "unknown",
    start_date: project.start_date,
    deadline: project.deadline,
    description: project.description,
    organization: project.organization,
    owner_name: project.owner?.name ?? null,
    contact_name: project.contact?.name ?? null,
    contact_email: project.contact?.email ?? null,
    summaries: {
      context: (contextSummary.data as { content: string } | null)?.content ?? null,
      briefing: (briefingSummary.data as { content: string } | null)?.content ?? null,
    },
  };
}

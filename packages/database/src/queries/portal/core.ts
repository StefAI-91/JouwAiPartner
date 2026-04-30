import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdmin } from "@repo/auth/access";
import {
  PORTAL_KEY_TO_INTERNAL_STATUSES,
  PORTAL_SOURCE_GROUPS,
  PORTAL_STATUS_GROUPS,
  type IssueType,
  type PortalSourceGroupKey,
  type PortalStatusKey,
} from "../../constants/issues";

export type PortalStatusFilter = PortalStatusKey;

export interface PortalIssueListFilters {
  status?: PortalStatusFilter;
  sourceGroup?: PortalSourceGroupKey;
  types?: IssueType[];
  limit?: number;
  offset?: number;
}

export type PortalIssueCountFilters = Pick<PortalIssueListFilters, "sourceGroup" | "types">;

const SOURCE_GROUP_TO_SOURCES = PORTAL_SOURCE_GROUPS.reduce(
  (acc, group) => {
    acc[group.key] = group.sources;
    return acc;
  },
  {} as Record<PortalSourceGroupKey, readonly string[]>,
);

export interface PortalProjectWithDetails {
  id: string;
  name: string;
  status: string;
  organization: { id: string; name: string } | null;
  last_activity_at: string | null;
}

const PORTAL_PROJECT_DETAIL_COLS = `
  id, name, status,
  organization:organizations(id, name)
`;

/**
 * List portal projects voor een profile, inclusief organisatie en laatste
 * activiteit (afgeleid van issues.updated_at). Admins zien alle projecten
 * (preview-mode), clients alleen projecten met rij in `portal_project_access`.
 *
 * `client` is verplicht omdat portal queries altijd in de context van een
 * ingelogde request draaien; een accidentele fallback naar de service-role
 * admin-client zou RLS omzeilen voor clients.
 */
export async function listPortalProjectsWithDetails(
  profileId: string,
  client: SupabaseClient,
): Promise<PortalProjectWithDetails[]> {
  if (!profileId) return [];

  let projects: {
    id: string;
    name: string;
    status: string | null;
    organization: { id: string; name: string } | null;
  }[] = [];

  if (await isAdmin(profileId, client)) {
    const { data, error } = await client
      .from("projects")
      .select(PORTAL_PROJECT_DETAIL_COLS)
      .order("name");
    if (error) {
      console.error("[listPortalProjectsWithDetails] Admin fetch error:", error.message);
      return [];
    }
    projects = (data ?? []) as unknown as typeof projects;
  } else {
    const { data, error } = await client
      .from("portal_project_access")
      .select(`projects(${PORTAL_PROJECT_DETAIL_COLS})`)
      .eq("profile_id", profileId);
    if (error) {
      console.error("[listPortalProjectsWithDetails] Client fetch error:", error.message);
      return [];
    }
    const rows = (data ?? []) as unknown as Array<{ projects: (typeof projects)[number] | null }>;
    projects = rows
      .map((row) => row.projects)
      .filter((p): p is (typeof projects)[number] => p !== null);
  }

  if (projects.length === 0) return [];

  const projectIds = projects.map((p) => p.id);
  const lastActivityMap = await fetchLastActivityMap(client, projectIds);

  return projects
    .map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status ?? "lead",
      organization: p.organization,
      last_activity_at: lastActivityMap.get(p.id) ?? null,
    }))
    .sort((a, b) => {
      const la = a.last_activity_at ?? "";
      const lb = b.last_activity_at ?? "";
      if (la !== lb) return lb.localeCompare(la);
      return a.name.localeCompare(b.name);
    });
}

/**
 * Bouwt een `project_id → max(updated_at)` mapping zonder N+1: haalt per
 * project alleen het laatst bijgewerkte issue op via parallelle `limit(1)`
 * queries. Bij N projecten zijn dat N goedkope index-lookups i.p.v. één scan
 * die alle rijen door de wire pompt.
 */
async function fetchLastActivityMap(
  client: SupabaseClient,
  projectIds: string[],
): Promise<Map<string, string>> {
  if (projectIds.length === 0) return new Map();

  const results = await Promise.all(
    projectIds.map(async (projectId) => {
      const { data, error } = await client
        .from("issues")
        .select("updated_at")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return [projectId, null] as const;
      return [projectId, (data as { updated_at: string | null }).updated_at] as const;
    }),
  );

  const map = new Map<string, string>();
  for (const [id, ts] of results) {
    if (ts) map.set(id, ts);
  }
  return map;
}

export interface PortalProjectDashboard {
  id: string;
  name: string;
  status: string;
  organization: { id: string; name: string } | null;
}

/**
 * Fetch minimale project-gegevens voor het portal dashboard. RLS blokt
 * automatisch wanneer een client geen toegang heeft.
 */
export async function getPortalProjectDashboard(
  projectId: string,
  client: SupabaseClient,
): Promise<PortalProjectDashboard | null> {
  const { data, error } = await client
    .from("projects")
    .select(PORTAL_PROJECT_DETAIL_COLS)
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    console.error("[getPortalProjectDashboard]", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    name: string;
    status: string | null;
    organization: { id: string; name: string } | null;
  };

  return {
    id: row.id,
    name: row.name,
    status: row.status ?? "lead",
    organization: row.organization,
  };
}

export type PortalIssueCounts = Record<PortalStatusKey, number>;

/**
 * Tel issues per portal-statusgroep — via N parallelle DB-counts i.p.v. alle
 * rijen ophalen en in JS tellen. Elke count is een head-only index-lookup.
 *
 * `filters` (CP-008) laten de counts dezelfde source/type-filters volgen als
 * de lijst zelf, zodat de bucket-headers nooit "Ingepland (8)" tonen terwijl
 * de zichtbare lijst maar 3 cards heeft.
 *
 * WG-004 (WG-REQ-079): test-submissies (label `'test'`) worden uit klant-
 * views weggefilterd. Onze eigen smoke-tests via de widget mogen de klant-
 * counts niet vervuilen. Admins zien ze nog wel — die view loopt via DevHub,
 * niet hier.
 */
export async function getProjectIssueCounts(
  projectId: string,
  client: SupabaseClient,
  filters?: PortalIssueCountFilters,
): Promise<PortalIssueCounts> {
  const sources = filters?.sourceGroup ? SOURCE_GROUP_TO_SOURCES[filters.sourceGroup] : null;
  const types = filters?.types && filters.types.length > 0 ? filters.types : null;

  const entries = await Promise.all(
    PORTAL_STATUS_GROUPS.map(async (group) => {
      let query = client
        .from("issues")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .in("status", [...group.internalStatuses])
        .not("labels", "cs", '{"test"}');
      if (sources) query = query.in("source", [...sources]);
      if (types) query = query.in("type", types);

      const { count, error } = await query;

      if (error) {
        console.error(`[getProjectIssueCounts:${group.key}]`, error.message);
        return [group.key, 0] as const;
      }
      return [group.key, count ?? 0] as const;
    }),
  );

  return Object.fromEntries(entries) as PortalIssueCounts;
}

export interface PortalIssue {
  id: string;
  issue_number: number;
  title: string;
  description: string | null;
  client_title: string | null;
  client_description: string | null;
  status: string;
  type: string;
  priority: string;
  source: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

const PORTAL_ISSUE_COLS =
  "id, issue_number, title, description, client_title, client_description, status, type, priority, source, created_at, updated_at, closed_at";

const DEFAULT_ISSUES_PAGE_SIZE = 50;
const MAX_ISSUES_PAGE_SIZE = 200;

/**
 * Portal issue lijst voor een project — alleen klant-relevante velden, geen
 * comments/assignees/interne metadata. Optioneel filteren op vertaalde
 * status-groep, source-groep ('client'/'jaip', CP-008) en/of types, plus
 * pagineren zodat een project met honderden issues de request niet opblaast.
 *
 * Source-filter mapt via `PORTAL_SOURCE_GROUPS` naar ruwe `source`-waarden;
 * onbekende sources blijven onzichtbaar onder beide groepen wanneer er
 * gefilterd wordt — dat is bewust, de UI toont ze in default-view en
 * resolveert hun groep visueel via `resolvePortalSourceGroup`.
 */
export async function listPortalIssues(
  projectId: string,
  client: SupabaseClient,
  filters?: PortalIssueListFilters,
): Promise<PortalIssue[]> {
  const limit = Math.min(filters?.limit ?? DEFAULT_ISSUES_PAGE_SIZE, MAX_ISSUES_PAGE_SIZE);
  const offset = Math.max(filters?.offset ?? 0, 0);

  let query = client
    .from("issues")
    .select(PORTAL_ISSUE_COLS)
    .eq("project_id", projectId)
    .not("labels", "cs", '{"test"}')
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.status) {
    const internal = PORTAL_KEY_TO_INTERNAL_STATUSES[filters.status];
    query = query.in("status", internal);
  }
  if (filters?.sourceGroup) {
    query = query.in("source", [...SOURCE_GROUP_TO_SOURCES[filters.sourceGroup]]);
  }
  if (filters?.types && filters.types.length > 0) {
    query = query.in("type", filters.types);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[listPortalIssues]", error.message);
    return [];
  }

  return (data ?? []) as PortalIssue[];
}

/**
 * Haal één issue op binnen de scope van een project. Retourneert `null` als
 * het issue niet bestaat of bij een ander project hoort — dat laatste voorkomt
 * dat een gebruiker via URL-manipulatie issues van andere projecten opvraagt
 * (RLS is de primaire lijn van verdediging, dit is extra defensief).
 *
 * WG-004: test-submissies blokkeren we op detail-niveau ook — anders kan een
 * klant via een directe URL-link toch een testrij openen die we juist niet
 * willen tonen.
 */
export async function getPortalIssue(
  issueId: string,
  projectId: string,
  client: SupabaseClient,
): Promise<PortalIssue | null> {
  const { data, error } = await client
    .from("issues")
    .select(PORTAL_ISSUE_COLS)
    .eq("id", issueId)
    .eq("project_id", projectId)
    .not("labels", "cs", '{"test"}')
    .maybeSingle();

  if (error) {
    console.error("[getPortalIssue]", error.message);
    return null;
  }

  return (data as PortalIssue | null) ?? null;
}

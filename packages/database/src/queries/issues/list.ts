import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import {
  PRIORITY_ORDER,
  DEVHUB_SOURCE_GROUPS,
  type DevhubSourceGroupKey,
} from "../../constants/issues";
import { getIssueIdsForTopics, getLinkedIssueIdsInProject } from "../topics/linked-issues";
import { ISSUE_SELECT, type IssueRow } from "./detail";
import { applyAssignedToFilter, sanitizeIlikeQuery } from "./_filters";

// CC-003 — flatten DEVHUB_SOURCE_GROUPS keys → ruwe `source`-waarden. Elders
// zou je dat per call doen, maar één afgeleide map houdt query-laag dom.
const DEVHUB_SOURCE_GROUP_TO_SOURCES: Record<DevhubSourceGroupKey, readonly string[]> =
  DEVHUB_SOURCE_GROUPS.reduce(
    (acc, group) => {
      acc[group.key] = group.sources;
      return acc;
    },
    {} as Record<DevhubSourceGroupKey, readonly string[]>,
  );

// UUID-regex hergebruikt voor het quoten van pre-fetched id-lijsten in
// `.not('id','in', ...)` — al zijn ids uit de DB, we filteren defensief.
const UUID_LIST_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ISSUE_SORTS = ["priority", "newest", "oldest"] as const;
export type IssueSort = (typeof ISSUE_SORTS)[number];

export interface ListIssuesParams {
  projectId?: string;
  projectIds?: string[];
  status?: string[];
  priority?: string[];
  type?: string[];
  component?: string[];
  assignedTo?: string[];
  topicIds?: string[];
  sourceGroups?: DevhubSourceGroupKey[];
  ungroupedOnly?: boolean;
  search?: string;
  issueNumber?: number;
}

/**
 * List issues with filters, pagination, and configurable sort.
 *
 * Scope: supply either `projectId` (single project) or `projectIds` (several
 * projects — used for members with multi-project access). At least one of
 * the two must be provided; an empty `projectIds` returns `[]`.
 *
 * Sort options:
 * - "priority" (default): priority weight (urgent → low), then newest first
 * - "newest": pure chronological, newest first
 * - "oldest": pure chronological, oldest first
 */
export async function listIssues(
  params: ListIssuesParams & {
    sort?: IssueSort;
    limit?: number;
    offset?: number;
  },
  client?: SupabaseClient,
): Promise<IssueRow[]> {
  const db = client ?? getAdminClient();
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const sort: IssueSort = params.sort ?? "priority";

  if (params.projectIds && params.projectIds.length === 0) return [];

  // `ungroupedOnly` wint van topic-filter — als beide gezet zijn negeren we
  // de topic-ids (UI moet de combinatie blokkeren, server is defensief).
  // Tweetraps query: pre-fetch ids, dan `.in()` of `.not('id','in', ...)`.
  let topicIssueIds: string[] | null = null;
  let excludeIssueIds: string[] | null = null;

  if (params.ungroupedOnly && params.projectId) {
    excludeIssueIds = await getLinkedIssueIdsInProject(params.projectId, db);
  } else if (params.topicIds && params.topicIds.length > 0) {
    topicIssueIds = await getIssueIdsForTopics(params.topicIds, db);
    if (topicIssueIds.length === 0) return [];
  }

  let query = db.from("issues").select(ISSUE_SELECT);
  if (params.projectIds) {
    query = query.in("project_id", params.projectIds);
  } else if (params.projectId) {
    query = query.eq("project_id", params.projectId);
  } else {
    return [];
  }

  if (topicIssueIds !== null) {
    query = query.in("id", topicIssueIds);
  }
  if (excludeIssueIds !== null && excludeIssueIds.length > 0) {
    const safe = excludeIssueIds.filter((id) => UUID_LIST_RE.test(id));
    const inList = safe.map((u) => `"${u}"`).join(",");
    query = query.not("id", "in", `(${inList})`);
  }

  if (params.status && params.status.length > 0) query = query.in("status", params.status);
  if (params.priority && params.priority.length > 0) query = query.in("priority", params.priority);
  if (params.type && params.type.length > 0) query = query.in("type", params.type);
  if (params.component && params.component.length > 0)
    query = query.in("component", params.component);
  if (params.sourceGroups && params.sourceGroups.length > 0) {
    const sources = params.sourceGroups.flatMap((key) => DEVHUB_SOURCE_GROUP_TO_SOURCES[key] ?? []);
    if (sources.length > 0) query = query.in("source", sources);
  }
  query = applyAssignedToFilter(query, params.assignedTo);
  if (params.issueNumber !== undefined) query = query.eq("issue_number", params.issueNumber);
  if (params.search) {
    const sanitized = sanitizeIlikeQuery(params.search);
    query = query.or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
  }

  // Ordering — chronological sorts are pure; priority sort groups by weight.
  if (sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (sort === "newest") {
    query = query.order("created_at", { ascending: false });
  } else {
    // "priority": alphabetical from DB, re-sorted by weight client-side below
    query = query.order("priority", { ascending: true }).order("created_at", { ascending: false });
  }
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error("[listIssues] Database error:", error.message);
    // Bubble up so callers (API routes, Server Components) can surface the
    // failure to the user or their error boundary, instead of returning an
    // empty result that looks indistinguishable from "no issues exist".
    throw new Error(`listIssues failed: ${error.message}`);
  }

  if (!data) return [];

  const rows = data as unknown as IssueRow[];

  if (sort === "priority") {
    // Re-sort by priority weight since DB sorts alphabetically
    rows.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      return 0; // keep DB order (created_at DESC) for same priority
    });
  }

  return rows;
}

/**
 * Count issues matching the same filters as listIssues (for pagination).
 *
 * Filter-laag is identiek aan `listIssues` via `applyAssignedToFilter` en
 * `sanitizeIlikeQuery`. Eerder dreef deze functie subtiel uiteen op de
 * `assignedTo`-fallback (CC-003 should-fix b); shared helpers voorkomen dat
 * voortaan.
 */
export async function countFilteredIssues(
  params: ListIssuesParams,
  client?: SupabaseClient,
): Promise<number> {
  const db = client ?? getAdminClient();

  if (params.projectIds && params.projectIds.length === 0) return 0;

  // Zelfde tweetraps logica als listIssues — zie comment daar.
  let topicIssueIds: string[] | null = null;
  let excludeIssueIds: string[] | null = null;
  if (params.ungroupedOnly && params.projectId) {
    excludeIssueIds = await getLinkedIssueIdsInProject(params.projectId, db);
  } else if (params.topicIds && params.topicIds.length > 0) {
    topicIssueIds = await getIssueIdsForTopics(params.topicIds, db);
    if (topicIssueIds.length === 0) return 0;
  }

  let query = db.from("issues").select("id", { count: "exact", head: true });
  if (params.projectIds) {
    query = query.in("project_id", params.projectIds);
  } else if (params.projectId) {
    query = query.eq("project_id", params.projectId);
  } else {
    return 0;
  }

  if (topicIssueIds !== null) query = query.in("id", topicIssueIds);
  if (excludeIssueIds !== null && excludeIssueIds.length > 0) {
    const safe = excludeIssueIds.filter((id) => UUID_LIST_RE.test(id));
    const inList = safe.map((u) => `"${u}"`).join(",");
    query = query.not("id", "in", `(${inList})`);
  }

  if (params.status && params.status.length > 0) query = query.in("status", params.status);
  if (params.priority && params.priority.length > 0) query = query.in("priority", params.priority);
  if (params.type && params.type.length > 0) query = query.in("type", params.type);
  if (params.component && params.component.length > 0)
    query = query.in("component", params.component);
  if (params.sourceGroups && params.sourceGroups.length > 0) {
    const sources = params.sourceGroups.flatMap((key) => DEVHUB_SOURCE_GROUP_TO_SOURCES[key] ?? []);
    if (sources.length > 0) query = query.in("source", sources);
  }
  query = applyAssignedToFilter(query, params.assignedTo);
  if (params.issueNumber !== undefined) query = query.eq("issue_number", params.issueNumber);
  if (params.search) {
    const sanitized = sanitizeIlikeQuery(params.search);
    query = query.or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
  }

  const { count, error } = await query;

  if (error) {
    console.error("[countFilteredIssues] Database error:", error.message);
    throw new Error(`countFilteredIssues failed: ${error.message}`);
  }

  return count ?? 0;
}

export { parseSearchQuery } from "./_filters";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import {
  topicStatusToBucket,
  type PortalBucketKey,
  type TopicLifecycleStatus,
  type TopicType,
} from "../../constants/topics";

/**
 * Lijst-velden voor topics. Bewust niet `select('*')` — alleen wat de
 * board-/roadmap-views renderen. Detail-velden (description, wont_do_reason)
 * komen via `getTopicById` uit `detail.ts`.
 */
export const TOPIC_LIST_COLS =
  "id, project_id, title, client_title, type, status, priority, target_sprint_id, closed_at, updated_at" as const;

export interface TopicListRow {
  id: string;
  project_id: string;
  title: string;
  client_title: string | null;
  type: TopicType;
  status: TopicLifecycleStatus;
  priority: string | null;
  target_sprint_id: string | null;
  closed_at: string | null;
  updated_at: string;
}

export interface ListTopicsFilters {
  type?: TopicType | TopicType[];
  status?: TopicLifecycleStatus | TopicLifecycleStatus[];
}

/**
 * Lijst topics binnen één project. Optioneel filteren op type en/of status.
 * Geen N+1: linked-issue-counts haal je apart op via `countIssuesPerTopic`
 * (één query voor N topics) — dat houdt deze list-query goedkoop.
 */
export async function listTopics(
  projectId: string,
  filters: ListTopicsFilters = {},
  client?: SupabaseClient,
): Promise<TopicListRow[]> {
  const db = client ?? getAdminClient();

  let query = db.from("topics").select(TOPIC_LIST_COLS).eq("project_id", projectId);

  if (filters.type) {
    query = Array.isArray(filters.type)
      ? query.in("type", filters.type)
      : query.eq("type", filters.type);
  }
  if (filters.status) {
    query = Array.isArray(filters.status)
      ? query.in("status", filters.status)
      : query.eq("status", filters.status);
  }

  query = query.order("updated_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw new Error(`listTopics failed: ${error.message}`);
  return (data ?? []) as unknown as TopicListRow[];
}

/**
 * Open topics inclusief `description`, voor de bulk-cluster-cleanup-agent.
 * Filter: status is geen `done`, `cancelled`, `wont_do` of `wont_do_proposed_by_client`.
 * Description heeft de bestaande lijst-query bewust niet (payload-bloat in
 * `/topics`-views) — daarom een aparte helper. Geen N+1: één call.
 */
export interface TopicForClusterRow {
  id: string;
  title: string;
  description: string | null;
  type: TopicType;
  status: TopicLifecycleStatus;
}

const OPEN_TOPIC_STATUSES_FOR_CLUSTER: TopicLifecycleStatus[] = [
  "clustering",
  "awaiting_client_input",
  "prioritized",
  "scheduled",
  "in_progress",
];

export async function listOpenTopicsForCluster(
  projectId: string,
  client?: SupabaseClient,
): Promise<TopicForClusterRow[]> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("topics")
    .select("id, title, description, type, status")
    .eq("project_id", projectId)
    .in("status", OPEN_TOPIC_STATUSES_FOR_CLUSTER)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`listOpenTopicsForCluster failed: ${error.message}`);
  return (data ?? []) as unknown as TopicForClusterRow[];
}

/**
 * Per topic max 5 al-gekoppelde issue-titels, meest recent gekoppeld eerst.
 * Voor de bulk-cluster-cleanup-agent: een topic-titel + abstracte description
 * is een zwakke fingerprint; al-gekoppelde issues laten zien wát er feitelijk
 * onder dit topic valt en helpen Haiku om alleen écht-passende ungrouped
 * issues toe te voegen i.p.v. te driften op woord-overlap.
 *
 * Eén PostgREST-call met embed van `topic_issues → issues(title)`. Sorteren
 * gebeurt op `linked_at desc`; cap op 5 in JS (PostgREST kent geen `LIMIT N
 * per group`). Bij <100 topics × paar honderd koppelingen ruim binnen budget.
 */
const SAMPLE_ISSUES_PER_TOPIC = 5;

export async function listTopicSampleIssues(
  topicIds: string[],
  client?: SupabaseClient,
): Promise<Map<string, string[]>> {
  if (topicIds.length === 0) return new Map();
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("topic_issues")
    .select("topic_id, linked_at, issues (title)")
    .in("topic_id", topicIds)
    .order("linked_at", { ascending: false });

  if (error) throw new Error(`listTopicSampleIssues failed: ${error.message}`);

  type Row = { topic_id: string; issues: { title: string } | null };
  const byTopic = new Map<string, string[]>();
  for (const row of (data ?? []) as unknown as Row[]) {
    if (!row.issues) continue;
    const titles = byTopic.get(row.topic_id);
    if (titles) {
      if (titles.length >= SAMPLE_ISSUES_PER_TOPIC) continue;
      titles.push(row.issues.title);
    } else {
      byTopic.set(row.topic_id, [row.issues.title]);
    }
  }
  return byTopic;
}

/**
 * Topics gegroepeerd per portal-bucket. Alleen statuses die voor de klant
 * zichtbaar zijn worden meegenomen — `clustering`, `wont_do` en
 * `wont_do_proposed_by_client` vallen er sowieso uit door
 * `topicStatusToBucket()` (PR-001).
 *
 * `currentSprintId` verfijnt de "Komende week"-bucket: topics in
 * `scheduled` met een ander sprint-id dan de huidige worden uit `upcoming`
 * gefilterd. Topics zonder `target_sprint_id` blijven zichtbaar (we kunnen
 * nog geen "next sprint" berekenen — geen sprints-tabel in v1, zie I-5).
 */
export async function listTopicsByBucket(
  projectId: string,
  currentSprintId: string | null = null,
  client?: SupabaseClient,
  options?: { origin?: "sprint" | "production" },
): Promise<Record<PortalBucketKey, TopicListRow[]>> {
  const db = client ?? getAdminClient();

  let query = db
    .from("topics")
    .select(TOPIC_LIST_COLS)
    .eq("project_id", projectId)
    .in("status", ["awaiting_client_input", "prioritized", "scheduled", "in_progress", "done"]);

  if (options?.origin) {
    query = query.eq("origin", options.origin);
  }

  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) throw new Error(`listTopicsByBucket failed: ${error.message}`);

  const buckets: Record<PortalBucketKey, TopicListRow[]> = {
    recent_done: [],
    upcoming: [],
    high_prio: [],
    awaiting_input: [],
  };

  for (const row of (data ?? []) as unknown as TopicListRow[]) {
    const bucket = topicStatusToBucket(row.status, row.closed_at);
    if (!bucket) continue;

    if (
      bucket === "upcoming" &&
      row.status === "scheduled" &&
      row.target_sprint_id &&
      currentSprintId &&
      row.target_sprint_id !== currentSprintId
    ) {
      continue;
    }

    buckets[bucket].push(row);
  }

  return buckets;
}

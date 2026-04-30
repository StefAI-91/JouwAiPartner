import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import type { LinkedIssueRow } from "./detail";

/**
 * Minimale topic-info zoals getoond als pill op de issue-row.
 * Alleen interne titel — DevHub is intern, geen `client_title`.
 */
export interface IssueTopicMembership {
  id: string;
  title: string;
}

/**
 * Tellen hoeveel issues elk topic heeft. Eén query voor N topic-id's,
 * geen N+1.
 *
 * Implementatie: `select('topic_id')` met `.in('topic_id', topicIds)`,
 * daarna in JS aggregeren. Goedkoper dan N losse `count='exact'`-calls
 * en idiomatischer dan een RPC voor de board-rendering. Met de
 * `idx_topic_issues_topic`-index is de scan O(N) en blijft ruim binnen
 * de 100-topics-cap die de board-page hanteert.
 */
export async function countIssuesPerTopic(
  topicIds: string[],
  client?: SupabaseClient,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (topicIds.length === 0) return result;

  const db = client ?? getAdminClient();
  const { data, error } = await db.from("topic_issues").select("topic_id").in("topic_id", topicIds);

  if (error) throw new Error(`countIssuesPerTopic failed: ${error.message}`);

  for (const id of topicIds) result.set(id, 0);
  for (const row of (data ?? []) as { topic_id: string }[]) {
    result.set(row.topic_id, (result.get(row.topic_id) ?? 0) + 1);
  }
  return result;
}

/**
 * PR-020 — Tellen hoeveel issues per topic in open-statussen vallen
 * (triage/backlog/todo/in_progress). Voor de "+N buiten je filter"-hint
 * op topic-section-headers: filter is actief op de issue-list, maar we
 * willen tonen hoeveel open werk onder dit topic in andere stadia ligt.
 *
 * Eén PostgREST-call: `topic_issues` met `!inner`-join naar `issues` zodat
 * we op `issues.status` kunnen filteren. Daarna in JS aggregeren — zelfde
 * patroon als `countIssuesPerTopic`. `done`/`cancelled` worden niet
 * meegeteld; die zijn niet relevant voor "wat ligt er nog".
 */
const OPEN_ISSUE_STATUSES_FOR_TOPIC_COUNT = ["triage", "backlog", "todo", "in_progress"] as const;

export async function countOpenIssuesPerTopic(
  topicIds: string[],
  client?: SupabaseClient,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (topicIds.length === 0) return result;

  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("topic_issues")
    .select("topic_id, issues!inner(status)")
    .in("topic_id", topicIds)
    .in("issues.status", Array.from(OPEN_ISSUE_STATUSES_FOR_TOPIC_COUNT));

  if (error) throw new Error(`countOpenIssuesPerTopic failed: ${error.message}`);

  for (const id of topicIds) result.set(id, 0);
  for (const row of (data ?? []) as { topic_id: string }[]) {
    result.set(row.topic_id, (result.get(row.topic_id) ?? 0) + 1);
  }
  return result;
}

/**
 * Voor een set issue-ids ophalen welk topic (indien aanwezig) eraan gekoppeld is.
 * Eén PostgREST-call met embed naar `topics`, geen N+1. Issues zonder topic
 * staan simpelweg niet in de result-Map. UNIQUE-constraint op `topic_issues.issue_id`
 * borgt max 1 topic per issue, dus ééndimensionale Map volstaat.
 */
export async function getTopicMembershipForIssues(
  issueIds: string[],
  client?: SupabaseClient,
): Promise<Map<string, IssueTopicMembership>> {
  const result = new Map<string, IssueTopicMembership>();
  if (issueIds.length === 0) return result;

  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("topic_issues")
    .select("issue_id, topics (id, title)")
    .in("issue_id", issueIds);

  if (error) throw new Error(`getTopicMembershipForIssues failed: ${error.message}`);

  for (const row of (data ?? []) as unknown as Array<{
    issue_id: string;
    topics: { id: string; title: string } | null;
  }>) {
    if (row.topics) {
      result.set(row.issue_id, { id: row.topics.id, title: row.topics.title });
    }
  }
  return result;
}

/**
 * Alle issue-ids die binnen een project aan een topic gekoppeld zijn.
 * Gebruikt door `listIssues`/`countFilteredIssues` voor de "ungrouped only"
 * toggle: filter `id NOT IN (deze lijst)`.
 *
 * Twee calls, geen embed-truc: eerst topic-ids van het project, dan
 * issue-ids uit `topic_issues`. Vermijdt de PostgREST-embed-quirks die
 * in TH-914 prod-only stuk gingen.
 */
export async function getLinkedIssueIdsInProject(
  projectId: string,
  client?: SupabaseClient,
): Promise<string[]> {
  const db = client ?? getAdminClient();

  const { data: topicRows, error: topicErr } = await db
    .from("topics")
    .select("id")
    .eq("project_id", projectId);
  if (topicErr) throw new Error(`getLinkedIssueIdsInProject (topics) failed: ${topicErr.message}`);
  const topicIds = ((topicRows ?? []) as { id: string }[]).map((r) => r.id);
  if (topicIds.length === 0) return [];

  const { data, error } = await db.from("topic_issues").select("issue_id").in("topic_id", topicIds);
  if (error) throw new Error(`getLinkedIssueIdsInProject (issues) failed: ${error.message}`);
  return ((data ?? []) as { issue_id: string }[]).map((r) => r.issue_id);
}

/**
 * Issue-prio's per topic. Voedt `deriveTopicPriorityFromIssues` zodat de UI
 * een suggestie kan tonen ("op basis van de issues hieronder zou dit topic
 * P1 moeten zijn"). Eén query voor één topic — N+1 is op deze flow geen
 * risico want we vragen per topic-detail.
 */
export async function getLinkedIssuePrioritiesForTopic(
  topicId: string,
  client?: SupabaseClient,
): Promise<string[]> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("topic_issues")
    .select("issues!inner(priority)")
    .eq("topic_id", topicId);

  if (error) throw new Error(`getLinkedIssuePrioritiesForTopic failed: ${error.message}`);

  return ((data ?? []) as unknown as Array<{ issues: { priority: string } | null }>)
    .map((r) => r.issues?.priority)
    .filter((p): p is string => typeof p === "string");
}

/**
 * Resolve één of meer topic-ids naar de issue-ids die eronder gekoppeld zijn.
 * Gebruikt door `listIssues`/`countFilteredIssues` om `?topic=<id>` te
 * filteren — eerst hier de issue-ids ophalen, dan via `id IN (...)` op issues
 * filteren. Geen embed-truc (vermijdt PostgREST-quirks zoals TH-914).
 */
export async function getIssueIdsForTopics(
  topicIds: string[],
  client?: SupabaseClient,
): Promise<string[]> {
  if (topicIds.length === 0) return [];

  const db = client ?? getAdminClient();
  const { data, error } = await db.from("topic_issues").select("issue_id").in("topic_id", topicIds);

  if (error) throw new Error(`getIssueIdsForTopics failed: ${error.message}`);
  return ((data ?? []) as { issue_id: string }[]).map((r) => r.issue_id);
}

/**
 * Alle gekoppelde issues voor één topic. Dunne wrapper voor flows die
 * de issues los nodig hebben (bv. unlink-dialog). Voor de detail-view
 * zelf gebruik je `getTopicWithIssues` zodat topic + issues in één call
 * komen.
 */
export async function getIssuesForTopic(
  topicId: string,
  client?: SupabaseClient,
): Promise<LinkedIssueRow[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("topic_issues")
    .select("issues (id, title, status, created_at)")
    .eq("topic_id", topicId);

  if (error) throw new Error(`getIssuesForTopic failed: ${error.message}`);

  return ((data ?? []) as unknown as Array<{ issues: LinkedIssueRow | null }>)
    .map((row) => row.issues)
    .filter((issue): issue is LinkedIssueRow => issue !== null)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

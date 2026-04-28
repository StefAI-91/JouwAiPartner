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

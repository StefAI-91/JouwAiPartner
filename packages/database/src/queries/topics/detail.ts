import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import type { TopicLifecycleStatus, TopicType } from "../../constants/topics";

/**
 * Volledig topic-record voor de detail-view. Bevat ook lange velden
 * (description, client_description, wont_do_reason) die we in de lijst-
 * query weglaten om payload klein te houden.
 */
export interface TopicDetailRow {
  id: string;
  project_id: string;
  title: string;
  client_title: string | null;
  description: string | null;
  client_description: string | null;
  type: TopicType;
  status: TopicLifecycleStatus;
  priority: string | null;
  target_sprint_id: string | null;
  status_overridden: boolean;
  wont_do_reason: string | null;
  closed_at: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
}

export interface LinkedIssueRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export interface TopicWithIssues extends TopicDetailRow {
  linked_issues: LinkedIssueRow[];
}

const TOPIC_DETAIL_COLS = `
  id, project_id, title, client_title, description, client_description,
  type, status, priority, target_sprint_id, status_overridden,
  wont_do_reason, closed_at, created_at, created_by, updated_at
` as const;

/**
 * Eén topic-record op id. Geen joins — gebruik `getTopicWithIssues` als je
 * ook de gekoppelde issues nodig hebt.
 */
export async function getTopicById(
  topicId: string,
  client?: SupabaseClient,
): Promise<TopicDetailRow | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("topics")
    .select(TOPIC_DETAIL_COLS)
    .eq("id", topicId)
    .maybeSingle();
  if (error) throw new Error(`getTopicById failed: ${error.message}`);
  return (data as unknown as TopicDetailRow | null) ?? null;
}

/**
 * Topic + alle gekoppelde issues in één PostgREST-call (geen N+1).
 *
 * De embed gaat via de junction-tabel `topic_issues`, dat is de FK-relatie
 * waar PostgREST automatisch op kan resolven. We laten de embed twee
 * hops maken: topic → topic_issues[] → issues. Daarna platten we
 * `linked_issues` in JS af zodat consumenten een gewone array hebben.
 *
 * Bewust geen `referencedTable`-tricks zoals in TH-914 — de simpele embed
 * is beter te debuggen en gedraagt zich identiek lokaal en in prod.
 */
export async function getTopicWithIssues(
  topicId: string,
  client?: SupabaseClient,
): Promise<TopicWithIssues | null> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("topics")
    .select(
      `
        ${TOPIC_DETAIL_COLS.trim()},
        topic_issues (
          issues (id, title, status, created_at)
        )
      `,
    )
    .eq("id", topicId)
    .maybeSingle();

  if (error) throw new Error(`getTopicWithIssues failed: ${error.message}`);
  if (!data) return null;

  const raw = data as unknown as TopicDetailRow & {
    topic_issues: Array<{ issues: LinkedIssueRow | null }> | null;
  };

  const linked_issues: LinkedIssueRow[] = (raw.topic_issues ?? [])
    .map((join) => join.issues)
    .filter((issue): issue is LinkedIssueRow => issue !== null)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const { topic_issues: _drop, ...topic } = raw;
  void _drop;
  return { ...topic, linked_issues };
}

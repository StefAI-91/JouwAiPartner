import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import type { TopicType } from "../../constants/topics";
import { getTopicById, type TopicDetailRow } from "../../queries/topics/detail";

/**
 * Insert-payload voor een nieuw topic. `created_by` is verplicht — de
 * caller (Server Action) leest die uit de auth-context en geeft 'm hier
 * door zodat deze laag puur DB blijft (geen `auth.getUser()` hier).
 *
 * `status` mag mee maar default = 'clustering' (DB-default). Mutatie
 * naar een andere status loopt via `updateTopicStatus`.
 */
export interface InsertTopicData {
  project_id: string;
  title: string;
  type: TopicType;
  created_by: string;
  client_title?: string | null;
  description?: string | null;
  client_description?: string | null;
  resolution?: string | null;
  client_resolution?: string | null;
  priority?: "P0" | "P1" | "P2" | "P3" | null;
  target_sprint_id?: string | null;
}

/**
 * Velden die je via `updateTopic` mag wijzigen. Bewust géén `status`
 * (zie `updateTopicStatus` — closed_at moet er sync mee blijven), géén
 * `id`/`project_id`/`created_at`/`created_by` (immutable).
 */
export interface UpdateTopicData {
  title?: string;
  client_title?: string | null;
  description?: string | null;
  client_description?: string | null;
  resolution?: string | null;
  client_resolution?: string | null;
  priority?: "P0" | "P1" | "P2" | "P3" | null;
  target_sprint_id?: string | null;
  status_overridden?: boolean;
}

export type MutationResult<T> = { success: true; data: T } | { error: string };

export async function insertTopic(
  data: InsertTopicData,
  client?: SupabaseClient,
): Promise<MutationResult<TopicDetailRow>> {
  const db = client ?? getAdminClient();
  const { data: row, error } = await db
    .from("topics")
    .insert(data)
    .select(
      `id, project_id, title, client_title, description, client_description,
       resolution, client_resolution,
       type, status, priority, target_sprint_id, status_overridden,
       wont_do_reason, closed_at, created_at, created_by, updated_at`,
    )
    .single();

  if (error) return { error: `insertTopic failed: ${error.message}` };
  return { success: true, data: row as unknown as TopicDetailRow };
}

export async function updateTopic(
  id: string,
  data: UpdateTopicData,
  client?: SupabaseClient,
): Promise<MutationResult<TopicDetailRow>> {
  const db = client ?? getAdminClient();
  const { data: row, error } = await db
    .from("topics")
    .update(data)
    .eq("id", id)
    .select(
      `id, project_id, title, client_title, description, client_description,
       resolution, client_resolution,
       type, status, priority, target_sprint_id, status_overridden,
       wont_do_reason, closed_at, created_at, created_by, updated_at`,
    )
    .single();

  if (error) return { error: `updateTopic failed: ${error.message}` };
  return { success: true, data: row as unknown as TopicDetailRow };
}

/**
 * Topic verwijderen. Faalt expliciet als er nog issues aan gekoppeld
 * zijn — eerst `unlinkIssueFromTopic` per issue, of bulk via een
 * dedicated mutation als die nodig blijkt. We willen geen stille
 * cascade omdat issues op zichzelf moeten blijven bestaan; de FK
 * `ON DELETE CASCADE` op `topic_issues` ruimt alleen de link op,
 * maar de UX-regel is: "leeg topic vóór delete" zodat de gebruiker
 * actief kiest waar issues heen gaan.
 */
export async function deleteTopic(
  id: string,
  client?: SupabaseClient,
): Promise<MutationResult<{ id: string }>> {
  const db = client ?? getAdminClient();

  const { count, error: countError } = await db
    .from("topic_issues")
    .select("issue_id", { count: "exact", head: true })
    .eq("topic_id", id);

  if (countError) return { error: `deleteTopic precheck failed: ${countError.message}` };
  if ((count ?? 0) > 0) {
    return {
      error: `Topic heeft ${count} gekoppelde issue(s); ontkoppel eerst voor je het topic verwijdert.`,
    };
  }

  const { error } = await db.from("topics").delete().eq("id", id);
  if (error) return { error: `deleteTopic failed: ${error.message}` };
  return { success: true, data: { id } };
}

// Re-export for callers that already had a TopicDetailRow handy via getTopicById
export { getTopicById };

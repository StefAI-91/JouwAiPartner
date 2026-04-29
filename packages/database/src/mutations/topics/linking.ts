import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import type { MutationResult } from "./crud";

export type LinkVia = "manual" | "agent" | "migration";

export interface LinkIssueResult {
  topic_id: string;
  issue_id: string;
  linked_at: string;
  linked_by: string;
  linked_via: LinkVia;
}

/**
 * Koppel een issue aan een topic. Faalt expliciet als het issue al aan een
 * (ander) topic gekoppeld is — de DB borgt dat via `UNIQUE (issue_id)` op
 * `topic_issues`. We mappen de Postgres unique-violation (SQLSTATE 23505)
 * naar een leesbare error voor de UI.
 *
 * `linkedBy` is verplicht (caller geeft auth.uid() door). `linkedVia`
 * default = 'manual'; agents zetten 'agent', backfill-scripts 'migration'.
 */
export async function linkIssueToTopic(
  topicId: string,
  issueId: string,
  linkedBy: string,
  linkedVia: LinkVia = "manual",
  client?: SupabaseClient,
): Promise<MutationResult<LinkIssueResult>> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("topic_issues")
    .insert({
      topic_id: topicId,
      issue_id: issueId,
      linked_by: linkedBy,
      linked_via: linkedVia,
    })
    .select("topic_id, issue_id, linked_at, linked_by, linked_via")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: `Issue is al aan een topic gekoppeld; ontkoppel eerst.` };
    }
    return { error: `linkIssueToTopic failed: ${error.message}` };
  }

  return { success: true, data: data as unknown as LinkIssueResult };
}

/**
 * Issue-centric topic-toewijzing: zet (of wis) het topic van een issue in
 * één call. Gebruikt de UNIQUE-constraint op `topic_issues.issue_id` voor
 * een upsert met `onConflict: "issue_id"` — Postgres-atomair: bestaande
 * koppeling wordt vervangen, geen race tussen delete + insert.
 *
 * `topicId === null` → ontkoppel (idempotent, zelfde regel als
 * `unlinkIssueFromTopic`).
 *
 * Returnt de nieuwe (of verwijderde) koppeling zodat de caller weet welk
 * topic eraan hing — handig voor revalidatePath van zowel oude als nieuwe
 * topic-pagina's.
 */
export async function setTopicForIssue(
  issueId: string,
  topicId: string | null,
  linkedBy: string,
  linkedVia: LinkVia = "manual",
  client?: SupabaseClient,
): Promise<MutationResult<{ issue_id: string; topic_id: string | null }>> {
  const db = client ?? getAdminClient();

  if (topicId === null) {
    const { error } = await db.from("topic_issues").delete().eq("issue_id", issueId);
    if (error) return { error: `setTopicForIssue (clear) failed: ${error.message}` };
    return { success: true, data: { issue_id: issueId, topic_id: null } };
  }

  const { data, error } = await db
    .from("topic_issues")
    .upsert(
      {
        topic_id: topicId,
        issue_id: issueId,
        linked_by: linkedBy,
        linked_via: linkedVia,
      },
      { onConflict: "issue_id" },
    )
    .select("topic_id, issue_id")
    .single();

  if (error) return { error: `setTopicForIssue failed: ${error.message}` };
  return {
    success: true,
    data: { issue_id: (data as { issue_id: string }).issue_id, topic_id: topicId },
  };
}

/**
 * Ontkoppel een issue van een topic. Idempotent: als de koppeling niet
 * (meer) bestaat is dat geen fout — de UX-regel is "het is gewoon weg".
 */
export async function unlinkIssueFromTopic(
  topicId: string,
  issueId: string,
  client?: SupabaseClient,
): Promise<MutationResult<{ topic_id: string; issue_id: string }>> {
  const db = client ?? getAdminClient();
  const { error } = await db
    .from("topic_issues")
    .delete()
    .eq("topic_id", topicId)
    .eq("issue_id", issueId);

  if (error) return { error: `unlinkIssueFromTopic failed: ${error.message}` };
  return { success: true, data: { topic_id: topicId, issue_id: issueId } };
}

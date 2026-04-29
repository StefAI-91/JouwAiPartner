import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import type { TopicLifecycleStatus } from "../../constants/topics";
import type { TopicDetailRow } from "../../queries/topics/detail";
import type { MutationResult } from "./crud";

const TERMINAL_STATUSES: TopicLifecycleStatus[] = ["done", "wont_do", "wont_do_proposed_by_client"];

export interface UpdateTopicStatusOpts {
  /**
   * Verplicht (en gevalideerd) als de nieuwe status `wont_do` of
   * `wont_do_proposed_by_client` is. In fase 1 zonder hard DB-check —
   * PR-009 voegt de min-10-chars-CHECK toe.
   */
  wont_do_reason?: string | null;
  /**
   * Markeer dat een mens de gemapte status heeft overruled (bv. handmatig
   * van `prioritized` naar `awaiting_client_input` zetten). Defaults op
   * `false`.
   */
  status_overridden?: boolean;
}

/**
 * Update alleen de status van een topic. Houdt `closed_at` in sync:
 * - terminale status (done/wont_do/wont_do_proposed_by_client) → set
 *   `closed_at = now()` als die nog leeg is (we overschrijven een
 *   bestaande timestamp niet — re-open + re-close moet expliciet via
 *   een latere mutation als de UX dat vraagt)
 * - niet-terminaal → `closed_at = null`
 *
 * Geen transitie-validatie in fase 1 — die landt in PR-007 (rollup) of
 * PR-009 (won't-do hardening).
 */
export async function updateTopicStatus(
  id: string,
  newStatus: TopicLifecycleStatus,
  opts: UpdateTopicStatusOpts = {},
  client?: SupabaseClient,
): Promise<MutationResult<TopicDetailRow>> {
  const db = client ?? getAdminClient();
  const isTerminal = TERMINAL_STATUSES.includes(newStatus);

  const patch: Record<string, unknown> = {
    status: newStatus,
  };
  if (isTerminal) {
    patch.closed_at = new Date().toISOString();
  } else {
    patch.closed_at = null;
  }
  if (opts.wont_do_reason !== undefined) {
    patch.wont_do_reason = opts.wont_do_reason;
  }
  if (opts.status_overridden !== undefined) {
    patch.status_overridden = opts.status_overridden;
  }

  const { data: row, error } = await db
    .from("topics")
    .update(patch)
    .eq("id", id)
    .select(
      `id, project_id, title, client_title, description, client_description,
       type, status, priority, target_sprint_id, status_overridden,
       wont_do_reason, closed_at, created_at, created_by, updated_at`,
    )
    .single();

  if (error) return { error: `updateTopicStatus failed: ${error.message}` };
  return { success: true, data: row as unknown as TopicDetailRow };
}

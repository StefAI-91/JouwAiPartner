import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

/**
 * TH-009 — queries op `meeting_themes` junction-tabel. Afgescheiden van
 * `mutations/meeting-themes.ts` zodat read-pads en write-pads niet in hetzelfde
 * bestand leven (CLAUDE.md §Database & Queries).
 */

/**
 * Set van meeting_ids die al één of meer theme-matches hebben. Gebruikt door
 * `scripts/batch-tag-themes.ts` om idempotente re-runs mogelijk te maken —
 * zonder `--force` slaat het script meetings met bestaande matches over.
 */
export async function listTaggedMeetingIds(client?: SupabaseClient): Promise<Set<string>> {
  const db = client ?? getAdminClient();
  const { data, error } = await db.from("meeting_themes").select("meeting_id");
  if (error) throw new Error(`listTaggedMeetingIds failed: ${error.message}`);
  return new Set((data ?? []).map((row) => row.meeting_id));
}

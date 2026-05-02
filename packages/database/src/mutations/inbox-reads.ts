import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

/**
 * CC-001 — `inbox_reads` per-user read-state mutations.
 *
 * Polymorphic: één rij per (profile_id, item_kind, item_id). Idempotente
 * UPSERT — herhaaldelijk markeren is veilig (latere read overschrijft).
 *
 * Geen Zod nodig: de signatuur dwingt de juiste types af; de unie van
 * `item_kind` is type-veilig op call-site.
 */

export type InboxItemKind = "issue" | "question";

export type InboxReadResult = { success: true } | { error: string };

export async function markInboxItemRead(
  profileId: string,
  kind: InboxItemKind,
  itemId: string,
  client?: SupabaseClient,
): Promise<InboxReadResult> {
  const db = client ?? getAdminClient();
  const { error } = await db.from("inbox_reads").upsert(
    {
      profile_id: profileId,
      item_kind: kind,
      item_id: itemId,
      read_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,item_kind,item_id" },
  );

  if (error) return { error: `markInboxItemRead failed: ${error.message}` };
  return { success: true };
}

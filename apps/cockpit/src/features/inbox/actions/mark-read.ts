"use server";

import { z } from "zod";
import { createClient } from "@repo/database/supabase/server";
import { getCurrentProfile } from "@repo/auth/access";
import { markInboxItemRead } from "@repo/database/mutations/inbox-reads";

/**
 * CC-001 — Expliciete read-mark vanuit de UI (bv. swipe-to-read in lijst,
 * of een toekomstige "markeer als gelezen"-knop). De detail-route markeert
 * automatisch via `getConversationThread` — daar is deze action niet voor.
 *
 * Geen revalidatePath: read-state is per-user, route-revalidation komt
 * natuurlijk bij de volgende navigatie.
 */

const markReadSchema = z.object({
  kind: z.enum(["issue", "question"]),
  itemId: z.string().uuid(),
});

export type MarkReadResult = { success: true } | { error: string };

export async function markInboxItemReadAction(input: unknown): Promise<MarkReadResult> {
  const parsed = markReadSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return { error: "Niet ingelogd" };
  if (profile.role === "client") return { error: "Geen toegang" };

  const result = await markInboxItemRead(
    profile.id,
    parsed.data.kind,
    parsed.data.itemId,
    supabase,
  );
  if ("error" in result) return { error: result.error };
  return { success: true };
}

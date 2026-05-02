"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import { getCurrentProfile } from "@repo/auth/access";
import { replyToQuestion } from "@repo/database/mutations/client-questions";
import { replyToQuestionSchema } from "@repo/database/validations/client-questions";
import { markInboxItemRead } from "@repo/database/mutations/inbox-reads";

/**
 * CC-001 — Cockpit reply als team. Mirror van portal `replyAsClientAction`,
 * maar `role: "team"` en geen portal-access-check (cockpit is team).
 */

export type ReplyAsTeamResult = { success: true } | { error: string };

export async function replyAsTeamAction(input: unknown): Promise<ReplyAsTeamResult> {
  const parsed = replyToQuestionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return { error: "Niet ingelogd" };
  if (profile.role === "client") return { error: "Geen toegang" };

  const result = await replyToQuestion(
    parsed.data,
    { profile_id: profile.id, role: "team" },
    supabase,
  );
  if ("error" in result) return { error: result.error };

  // De parent_id staat in de gevalideerde payload — markeer de root als read.
  const parentId = parsed.data.parent_id;
  if (parentId) {
    await markInboxItemRead(profile.id, "question", parentId, supabase);
  }

  revalidatePath("/inbox");
  if (parentId) revalidatePath(`/inbox/question/${parentId}`);
  revalidatePath("/", "layout");
  return { success: true };
}

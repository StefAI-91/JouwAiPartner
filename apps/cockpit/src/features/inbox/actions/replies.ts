"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import { getCurrentProfile } from "@repo/auth/access";
import { replyToQuestion } from "@repo/database/mutations/client-questions";
import { getQuestionById } from "@repo/database/queries/client-questions";
import { replyToQuestionSchema } from "@repo/database/validations/client-questions";
import { markInboxItemRead } from "@repo/database/mutations/inbox-reads";
import { notifyTeamReply } from "@repo/notifications";

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

    // CC-002 — klant-mail bij team-reply. Parent-lookup is best-effort: als
    // het faalt skippen we silent (mail is niet de SoT).
    const parent = await getQuestionById(parentId, supabase);
    if (parent) {
      await notifyTeamReply(parent, parsed.data.body, supabase).catch((err) =>
        console.error("[replyAsTeamAction] notify failed", err),
      );
    }
  }

  // CC-008 — vervang het dure `revalidatePath("/", "layout")` door per-route
  // revalidatie zoals pm-review.ts.
  revalidatePath("/inbox");
  if (parentId) revalidatePath(`/inbox/question/${parentId}`);
  revalidatePath("/projects/[id]/inbox", "page");
  return { success: true };
}

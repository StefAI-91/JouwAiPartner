"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createPageClient, getAuthenticatedUser } from "@repo/auth/helpers";
import { sendQuestion, replyToQuestion } from "@repo/database/mutations/client-questions";
import { replyToQuestionSchema } from "@repo/database/validations/client-questions";

/**
 * PR-023 — Server Actions voor team↔klant-vragen vanuit DevHub.
 *
 * `askQuestionAction` (root): leidt `organization_id` zelf af uit het project.
 * Dat houdt het modal-payload klein én voorkomt dat een geknoeid form de
 * organisatie van een ander project kan opgeven. De volledige `sendQuestionSchema`
 * uit `validations/client-questions` valideert daarna de samengestelde input.
 *
 * `replyAsTeamAction` (reply): hergebruikt `replyToQuestionSchema` 1-op-1 —
 * `parent_id` + body is alles wat de mutation nodig heeft, want
 * `replyToQuestion` haalt project + org zelf uit de parent.
 */

const askQuestionInputSchema = z.object({
  project_id: z.string().uuid(),
  body: z.string().min(10).max(2000),
  topic_id: z.string().uuid().nullable().optional(),
  issue_id: z.string().uuid().nullable().optional(),
  due_date: z.string().datetime().nullable().optional(),
});

export type AskQuestionInput = z.infer<typeof askQuestionInputSchema>;

export async function askQuestionAction(
  input: AskQuestionInput,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = askQuestionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const supabase = await createPageClient();

  // Org afleiden uit project — minimal select, niet de zware getProjectById.
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("organization_id")
    .eq("id", parsed.data.project_id)
    .single();

  if (projectError || !project?.organization_id) {
    return { error: "Project of organisatie niet gevonden" };
  }

  const result = await sendQuestion(
    {
      project_id: parsed.data.project_id,
      organization_id: project.organization_id as string,
      body: parsed.data.body,
      topic_id: parsed.data.topic_id ?? null,
      issue_id: parsed.data.issue_id ?? null,
      due_date: parsed.data.due_date ?? null,
    },
    user.id,
    supabase,
  );

  if ("error" in result) return { error: result.error };

  if (parsed.data.topic_id) {
    revalidatePath(`/topics/${parsed.data.topic_id}`);
  }
  if (parsed.data.issue_id) {
    revalidatePath(`/issues/${parsed.data.issue_id}`);
  }
  return { success: true };
}

export async function replyAsTeamAction(
  input: unknown,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = replyToQuestionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const supabase = await createPageClient();
  const result = await replyToQuestion(
    parsed.data,
    { profile_id: user.id, role: "team" },
    supabase,
  );

  if ("error" in result) return { error: result.error };

  // We weten niet of deze parent aan een topic of issue hangt — beide
  // revalideren is goedkoop en voorkomt stale threads in de UI. Het is
  // de prijs van een Server Action die generiek over root-types werkt.
  revalidatePath("/topics", "layout");
  revalidatePath("/issues", "layout");
  return { success: true };
}

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { updateComment, deleteComment, insertActivity } from "@repo/database/mutations/issues";
import { updateCommentSchema, deleteCommentSchema } from "@repo/database/validations/issues";
import { getAuthenticatedUser } from "@repo/auth/helpers";

// ── Actions ──

export async function updateCommentAction(
  input: z.input<typeof updateCommentSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = updateCommentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  try {
    await updateComment(parsed.data.id, parsed.data.body);
    revalidatePath(`/issues/${parsed.data.issue_id}`);
    return { success: true };
  } catch (err) {
    console.error("[updateCommentAction]", err);
    return { error: "Reactie bijwerken mislukt" };
  }
}

export async function deleteCommentAction(
  input: z.input<typeof deleteCommentSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = deleteCommentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  try {
    await deleteComment(parsed.data.id);

    await insertActivity({
      issue_id: parsed.data.issue_id,
      actor_id: user.id,
      action: "comment_deleted",
    });

    revalidatePath(`/issues/${parsed.data.issue_id}`);
    return { success: true };
  } catch (err) {
    console.error("[deleteCommentAction]", err);
    return { error: "Reactie verwijderen mislukt" };
  }
}

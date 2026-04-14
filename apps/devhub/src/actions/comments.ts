"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  insertComment,
  updateComment,
  deleteComment,
  insertActivity,
} from "@repo/database/mutations/issues";
import { getIssueById } from "@repo/database/queries/issues";
import { getCommentById } from "@repo/database/queries/issue-comments";
import {
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
} from "@repo/database/validations/issues";
import { assertProjectAccess, NotAuthorizedError, requireUserInAction } from "@repo/auth/access";

async function assertAccessToIssue(
  userId: string,
  issueId: string,
): Promise<{ ok: true } | { error: string }> {
  const issue = await getIssueById(issueId);
  if (!issue) return { error: "Issue niet gevonden" };
  try {
    await assertProjectAccess(userId, issue.project_id);
    return { ok: true };
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: "Issue niet gevonden" };
    throw e;
  }
}

// ── Actions ──

export async function createCommentAction(
  input: z.input<typeof createCommentSchema>,
): Promise<{ success: true } | { error: string }> {
  const auth = await requireUserInAction();
  if ("error" in auth) return auth;

  const parsed = createCommentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const access = await assertAccessToIssue(auth.user.id, parsed.data.issue_id);
  if ("error" in access) return access;

  const result = await insertComment({
    issue_id: parsed.data.issue_id,
    author_id: auth.user.id,
    body: parsed.data.body,
  });
  if ("error" in result) return { error: "Reactie plaatsen mislukt" };

  await insertActivity({
    issue_id: parsed.data.issue_id,
    actor_id: auth.user.id,
    action: "commented",
  });

  revalidatePath(`/issues`);
  revalidatePath(`/issues/${parsed.data.issue_id}`);
  return { success: true };
}

export async function updateCommentAction(
  input: z.input<typeof updateCommentSchema>,
): Promise<{ success: true } | { error: string }> {
  const auth = await requireUserInAction();
  if ("error" in auth) return auth;

  const parsed = updateCommentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const access = await assertAccessToIssue(auth.user.id, parsed.data.issue_id);
  if ("error" in access) return access;

  const comment = await getCommentById(parsed.data.id, parsed.data.issue_id);
  if (!comment || comment.author_id !== auth.user.id) {
    return { error: "Alleen de auteur kan deze reactie wijzigen" };
  }

  const result = await updateComment(parsed.data.id, parsed.data.body);
  if ("error" in result) return { error: "Reactie bijwerken mislukt" };

  revalidatePath(`/issues/${parsed.data.issue_id}`);
  return { success: true };
}

export async function deleteCommentAction(
  input: z.input<typeof deleteCommentSchema>,
): Promise<{ success: true } | { error: string }> {
  const auth = await requireUserInAction();
  if ("error" in auth) return auth;

  const parsed = deleteCommentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const access = await assertAccessToIssue(auth.user.id, parsed.data.issue_id);
  if ("error" in access) return access;

  const comment = await getCommentById(parsed.data.id, parsed.data.issue_id);
  if (!comment || comment.author_id !== auth.user.id) {
    return { error: "Alleen de auteur kan deze reactie verwijderen" };
  }

  const result = await deleteComment(parsed.data.id);
  if ("error" in result) return { error: "Reactie verwijderen mislukt" };

  await insertActivity({
    issue_id: parsed.data.issue_id,
    actor_id: auth.user.id,
    action: "comment_deleted",
  });

  revalidatePath(`/issues/${parsed.data.issue_id}`);
  return { success: true };
}

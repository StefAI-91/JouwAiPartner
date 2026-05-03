"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  insertComment,
  updateComment,
  deleteComment,
  insertActivity,
} from "@repo/database/mutations/issues";
import { ensureProfileExists } from "@repo/database/mutations/team";
import { getIssueById } from "@repo/database/queries/issues";
import { getCommentById } from "@repo/database/queries/issues/comments";
import {
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
} from "@repo/database/validations/issues";
import { getAuthenticatedUser, isAuthBypassed } from "@repo/auth/helpers";
import { assertProjectAccess, NotAuthorizedError } from "@repo/auth/access";

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
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = createCommentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const access = await assertAccessToIssue(user.id, parsed.data.issue_id);
  if ("error" in access) return access;

  // issue_comments.author_id FKs to profiles(id). Legacy óf trigger-missed
  // auth.users (zie 20260503100000_backfill_profiles_for_existing_auth_users)
  // missen een profile-rij — self-heal voor we de comment inserten zodat we
  // niet meer op een FK violation crashen. Dev-bypass user zit niet in
  // auth.users, dus profile-insert daar zou zelf crashen op profiles.id FK.
  if (!isAuthBypassed() && user.email) {
    await ensureProfileExists({ id: user.id, email: user.email });
  }

  const result = await insertComment({
    issue_id: parsed.data.issue_id,
    author_id: user.id,
    body: parsed.data.body,
  });
  if ("error" in result) {
    // Log server-side zodat we de Supabase-error in Vercel-logs / lokale
    // terminal kunnen zien. Zonder dit zag de gebruiker alleen "Reactie
    // plaatsen mislukt" terwijl de echte oorzaak (FK violation, RLS,
    // schema-mismatch, ...) verborgen bleef.
    console.error("[createCommentAction] insertComment failed:", result.error, {
      issueId: parsed.data.issue_id,
      authorId: user.id,
    });
    return { error: result.error };
  }

  await insertActivity({
    issue_id: parsed.data.issue_id,
    actor_id: user.id,
    action: "commented",
  });

  revalidatePath(`/issues`);
  revalidatePath(`/issues/${parsed.data.issue_id}`);
  return { success: true };
}

export async function updateCommentAction(
  input: z.input<typeof updateCommentSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = updateCommentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const access = await assertAccessToIssue(user.id, parsed.data.issue_id);
  if ("error" in access) return access;

  const comment = await getCommentById(parsed.data.id, parsed.data.issue_id);
  if (!comment || comment.author_id !== user.id) {
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
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = deleteCommentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const access = await assertAccessToIssue(user.id, parsed.data.issue_id);
  if ("error" in access) return access;

  const comment = await getCommentById(parsed.data.id, parsed.data.issue_id);
  if (!comment || comment.author_id !== user.id) {
    return { error: "Alleen de auteur kan deze reactie verwijderen" };
  }

  const result = await deleteComment(parsed.data.id);
  if ("error" in result) return { error: "Reactie verwijderen mislukt" };

  await insertActivity({
    issue_id: parsed.data.issue_id,
    actor_id: user.id,
    action: "comment_deleted",
  });

  revalidatePath(`/issues/${parsed.data.issue_id}`);
  return { success: true };
}

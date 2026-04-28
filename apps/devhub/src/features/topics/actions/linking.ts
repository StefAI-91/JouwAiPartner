"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { assertProjectAccess, NotAuthorizedError } from "@repo/auth/access";
import { linkIssueToTopic, unlinkIssueFromTopic } from "@repo/database/mutations/topics";
import { getTopicById } from "@repo/database/queries/topics";
import { listIssues } from "@repo/database/queries/issues";
import { linkIssueSchema } from "../validations/topic";

type ActionResult = { success: true } | { error: string };

export interface IssuePickerRow {
  id: string;
  title: string;
  status: string;
  issue_number: number;
}

const searchSchema = z.object({
  project_id: z.string().uuid(),
  q: z.string().trim().max(200).optional(),
});

/**
 * Server-side issue-search voor de linked-issues-picker. Cap op 50
 * resultaten — picker is geen volledige lijst-view, dat doet `/issues`.
 */
export async function searchProjectIssuesAction(
  input: unknown,
): Promise<{ data: IssuePickerRow[] } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  try {
    await assertProjectAccess(user.id, parsed.data.project_id);
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: "Geen toegang tot dit project" };
    throw e;
  }

  const issues = await listIssues({
    projectId: parsed.data.project_id,
    search: parsed.data.q,
    limit: 50,
  });

  return {
    data: issues.map((i) => ({
      id: i.id,
      title: i.title,
      status: i.status,
      issue_number: i.issue_number,
    })),
  };
}

async function ensureProjectAccessOnTopic(
  userId: string,
  topicId: string,
): Promise<{ ok: true; projectId: string } | { error: string }> {
  const topic = await getTopicById(topicId);
  if (!topic) return { error: "Topic niet gevonden" };
  try {
    await assertProjectAccess(userId, topic.project_id);
    return { ok: true, projectId: topic.project_id };
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: "Topic niet gevonden" };
    throw e;
  }
}

export async function linkIssueAction(input: unknown): Promise<ActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = linkIssueSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const access = await ensureProjectAccessOnTopic(user.id, parsed.data.topic_id);
  if ("error" in access) return access;

  const result = await linkIssueToTopic(
    parsed.data.topic_id,
    parsed.data.issue_id,
    user.id,
    "manual",
  );
  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath(`/topics/${parsed.data.topic_id}`);
  revalidatePath(`/issues/${parsed.data.issue_id}`);
  return { success: true };
}

export async function unlinkIssueAction(input: unknown): Promise<ActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = linkIssueSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const access = await ensureProjectAccessOnTopic(user.id, parsed.data.topic_id);
  if ("error" in access) return access;

  const result = await unlinkIssueFromTopic(parsed.data.topic_id, parsed.data.issue_id);
  if ("error" in result) return { error: "Ontkoppelen mislukt" };

  revalidatePath(`/topics/${parsed.data.topic_id}`);
  revalidatePath(`/issues/${parsed.data.issue_id}`);
  return { success: true };
}

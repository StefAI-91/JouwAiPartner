"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { assertProjectAccess, NotAuthorizedError } from "@repo/auth/access";
import {
  linkIssueToTopic,
  setTopicForIssue,
  unlinkIssueFromTopic,
} from "@repo/database/mutations/topics";
import { getTopicById, getTopicMembershipForIssues } from "@repo/database/queries/topics";
import { getIssueById, listIssues } from "@repo/database/queries/issues";
import { linkIssueSchema, setIssueTopicSchema } from "../validations/topic";

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

/**
 * Issue-centric: zet (of wis) het topic van een issue. Atomair via upsert
 * op `topic_issues.issue_id` (UNIQUE-constraint). Auth-check via het
 * project van de issue, niet via topics — dit is een issue-perspectief.
 *
 * Als het issue al aan een ander topic hangt, halen we dat eerst op zodat
 * we ook de oude topic-pagina kunnen revalidaten. Kost één extra query
 * maar voorkomt dat een topic-detail pagina muffe linked-issues toont.
 */
export async function setIssueTopicAction(input: unknown): Promise<ActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = setIssueTopicSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const issue = await getIssueById(parsed.data.issue_id);
  if (!issue) return { error: "Issue niet gevonden" };

  try {
    await assertProjectAccess(user.id, issue.project_id);
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: "Issue niet gevonden" };
    throw e;
  }

  // Als de doel-topic in een ánder project zit, weiger — anders kun je via
  // de issue-detail-pagina van project A een topic uit project B aanhaken.
  if (parsed.data.topic_id !== null) {
    const topic = await getTopicById(parsed.data.topic_id);
    if (!topic || topic.project_id !== issue.project_id) {
      return { error: "Topic niet gevonden" };
    }
  }

  const previousMembership = await getTopicMembershipForIssues([parsed.data.issue_id]);
  const previousTopicId = previousMembership.get(parsed.data.issue_id)?.id ?? null;

  const result = await setTopicForIssue(
    parsed.data.issue_id,
    parsed.data.topic_id,
    user.id,
    "manual",
  );
  if ("error" in result) return { error: result.error };

  revalidatePath("/issues");
  revalidatePath(`/issues/${parsed.data.issue_id}`);
  if (previousTopicId && previousTopicId !== parsed.data.topic_id) {
    revalidatePath(`/topics/${previousTopicId}`);
  }
  if (parsed.data.topic_id) {
    revalidatePath(`/topics/${parsed.data.topic_id}`);
  }
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

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import {
  insertIssue,
  updateIssue,
  deleteIssue,
  insertComment,
} from "@repo/database/mutations/issues";

// ── Zod Schemas ──

const ISSUE_TYPES = ["bug", "feature", "improvement", "task", "question"] as const;
const ISSUE_STATUSES = ["triage", "backlog", "todo", "in_progress", "done", "cancelled"] as const;
const ISSUE_PRIORITIES = ["urgent", "high", "medium", "low"] as const;

const createIssueSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1, "Titel is verplicht").max(500),
  description: z.string().max(10000).nullish(),
  type: z.enum(ISSUE_TYPES).default("bug"),
  status: z.enum(ISSUE_STATUSES).default("triage"),
  priority: z.enum(ISSUE_PRIORITIES).default("medium"),
  component: z.string().max(100).nullish(),
  severity: z.string().max(50).nullish(),
  labels: z.array(z.string()).default([]),
  assigned_to: z.string().uuid().nullish(),
  reporter_name: z.string().max(200).nullish(),
  reporter_email: z.string().email().nullish(),
});

const updateIssueSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).nullish(),
  type: z.enum(ISSUE_TYPES).optional(),
  status: z.enum(ISSUE_STATUSES).optional(),
  priority: z.enum(ISSUE_PRIORITIES).optional(),
  component: z.string().max(100).nullish(),
  severity: z.string().max(50).nullish(),
  labels: z.array(z.string()).optional(),
  assigned_to: z.string().uuid().nullish(),
  closed_at: z.string().nullish(),
});

const deleteIssueSchema = z.object({
  id: z.string().uuid(),
});

const createCommentSchema = z.object({
  issue_id: z.string().uuid(),
  body: z.string().min(1, "Reactie mag niet leeg zijn").max(10000),
});

// ── Auth Helper ──

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ── Actions ──

export async function createIssueAction(
  input: z.input<typeof createIssueSchema>,
): Promise<{ success: true; id: string } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = createIssueSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  try {
    const issue = await insertIssue(parsed.data);
    revalidatePath("/issues");
    return { success: true, id: issue.id };
  } catch (err) {
    console.error("[createIssueAction]", err);
    return { error: "Issue aanmaken mislukt" };
  }
}

export async function updateIssueAction(
  input: z.input<typeof updateIssueSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = updateIssueSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const { id, ...data } = parsed.data;

  try {
    await updateIssue(id, data);
    revalidatePath("/issues");
    revalidatePath(`/issues/${id}`);
    return { success: true };
  } catch (err) {
    console.error("[updateIssueAction]", err);
    return { error: "Issue bijwerken mislukt" };
  }
}

export async function deleteIssueAction(
  input: z.input<typeof deleteIssueSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = deleteIssueSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  try {
    await deleteIssue(parsed.data.id);
    revalidatePath("/issues");
    return { success: true };
  } catch (err) {
    console.error("[deleteIssueAction]", err);
    return { error: "Issue verwijderen mislukt" };
  }
}

export async function createCommentAction(
  input: z.input<typeof createCommentSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = createCommentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  try {
    await insertComment({
      issue_id: parsed.data.issue_id,
      author_id: user.id,
      body: parsed.data.body,
    });
    revalidatePath(`/issues`);
    return { success: true };
  } catch (err) {
    console.error("[createCommentAction]", err);
    return { error: "Reactie plaatsen mislukt" };
  }
}

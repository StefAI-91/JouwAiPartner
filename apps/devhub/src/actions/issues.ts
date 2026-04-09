"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import {
  insertIssue,
  updateIssue,
  deleteIssue,
  insertComment,
  insertActivity,
} from "@repo/database/mutations/issues";
import { getIssueById } from "@repo/database/queries/issues";
import { classifyIssueBackground } from "./classify";

// ── Constants ──

const ISSUE_TYPES = ["bug", "feature", "improvement", "task", "question"] as const;
const ISSUE_STATUSES = ["triage", "backlog", "todo", "in_progress", "done", "cancelled"] as const;
const ISSUE_PRIORITIES = ["urgent", "high", "medium", "low"] as const;
const COMPONENTS = ["frontend", "backend", "api", "database", "prompt_ai", "unknown"] as const;
const SEVERITIES = ["critical", "high", "medium", "low"] as const;
const CLOSED_STATUSES = new Set(["done", "cancelled"]);

// ── Zod Schemas ──

const createIssueSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1, "Titel is verplicht").max(500),
  description: z.string().max(10000).nullish(),
  type: z.enum(ISSUE_TYPES).default("bug"),
  status: z.enum(ISSUE_STATUSES).default("triage"),
  priority: z.enum(ISSUE_PRIORITIES).default("medium"),
  component: z.enum(COMPONENTS).nullish(),
  severity: z.enum(SEVERITIES).nullish(),
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
  component: z.enum(COMPONENTS).nullish(),
  severity: z.enum(SEVERITIES).nullish(),
  labels: z.array(z.string()).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
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

    await insertActivity({
      issue_id: issue.id,
      actor_id: user.id,
      action: "created",
    });

    // Fire-and-forget AI classification (not awaited)
    classifyIssueBackground(issue.id);

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
    // Fetch current issue for activity diff
    const current = await getIssueById(id);
    if (!current) return { error: "Issue niet gevonden" };

    // Auto-set closed_at based on status change
    const updateData: Record<string, unknown> = { ...data };
    if (data.status) {
      const wasClosedStatus = CLOSED_STATUSES.has(current.status);
      const isClosedStatus = CLOSED_STATUSES.has(data.status);
      if (!wasClosedStatus && isClosedStatus) {
        updateData.closed_at = new Date().toISOString();
      } else if (wasClosedStatus && !isClosedStatus) {
        updateData.closed_at = null;
      }
    }

    await updateIssue(id, updateData);

    // Log activity for each changed field
    const activityPromises: Promise<void>[] = [];
    const trackFields = [
      "status",
      "priority",
      "type",
      "component",
      "severity",
      "assigned_to",
    ] as const;

    for (const field of trackFields) {
      if (data[field] === undefined) continue;
      const oldVal = current[field as keyof typeof current];
      const newVal = data[field];
      if (String(oldVal ?? "") === String(newVal ?? "")) continue;

      const action =
        field === "status"
          ? "status_changed"
          : field === "priority"
            ? "priority_changed"
            : field === "assigned_to"
              ? "assigned"
              : "field_changed";

      activityPromises.push(
        insertActivity({
          issue_id: id,
          actor_id: user.id,
          action,
          field,
          old_value: oldVal != null ? String(oldVal) : undefined,
          new_value: newVal != null ? String(newVal) : undefined,
        }),
      );
    }

    // Track title/description changes
    if (data.title && data.title !== current.title) {
      activityPromises.push(
        insertActivity({
          issue_id: id,
          actor_id: user.id,
          action: "field_changed",
          field: "title",
          old_value: current.title,
          new_value: data.title,
        }),
      );
    }

    // Track label changes
    if (data.labels) {
      const oldLabels = new Set(current.labels ?? []);
      const newLabels = new Set(data.labels);
      for (const label of data.labels) {
        if (!oldLabels.has(label)) {
          activityPromises.push(
            insertActivity({
              issue_id: id,
              actor_id: user.id,
              action: "label_added",
              new_value: label,
            }),
          );
        }
      }
      for (const label of current.labels ?? []) {
        if (!newLabels.has(label)) {
          activityPromises.push(
            insertActivity({
              issue_id: id,
              actor_id: user.id,
              action: "label_removed",
              old_value: label,
            }),
          );
        }
      }
    }

    await Promise.all(activityPromises);

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

    await insertActivity({
      issue_id: parsed.data.issue_id,
      actor_id: user.id,
      action: "commented",
    });

    revalidatePath(`/issues`);
    revalidatePath(`/issues/${parsed.data.issue_id}`);
    return { success: true };
  } catch (err) {
    console.error("[createCommentAction]", err);
    return { error: "Reactie plaatsen mislukt" };
  }
}

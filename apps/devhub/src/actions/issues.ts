"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  insertIssue,
  updateIssue,
  deleteIssue,
  insertComment,
  insertActivity,
} from "@repo/database/mutations/issues";
import { getIssueById } from "@repo/database/queries/issues";
import { classifyIssueBackground } from "./classify";
import { CLOSED_STATUSES, type IssueStatus } from "@repo/database/constants/issues";
import {
  createIssueSchema,
  updateIssueSchema,
  deleteIssueSchema,
  createCommentSchema,
} from "@repo/database/validations/issues";
import { getAuthenticatedUser } from "@repo/auth/helpers";

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
    const current = await getIssueById(id);
    if (!current) return { error: "Issue niet gevonden" };

    const updateData: Record<string, unknown> = { ...data };
    if (data.status) {
      const wasClosedStatus = CLOSED_STATUSES.has(current.status as IssueStatus);
      const isClosedStatus = CLOSED_STATUSES.has(data.status as IssueStatus);
      if (!wasClosedStatus && isClosedStatus) {
        updateData.closed_at = new Date().toISOString();
      } else if (wasClosedStatus && !isClosedStatus) {
        updateData.closed_at = null;
      }
    }

    await updateIssue(id, updateData);

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

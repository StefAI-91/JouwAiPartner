"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  insertIssue,
  updateIssue,
  deleteIssue,
  insertActivity,
} from "@repo/database/mutations/issues";
import { getIssueById, getIssueCounts } from "@repo/database/queries/issues";
import { classifyIssueBackground } from "./classify";
import { CLOSED_STATUSES, type IssueStatus } from "@repo/database/constants/issues";
import {
  createIssueSchema,
  updateIssueSchema,
  deleteIssueSchema,
} from "@repo/database/validations/issues";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { assertProjectAccess, NotAuthorizedError } from "@repo/auth/access";
import {
  resolveSlackEvent,
  notifySlackIfUrgent,
  type SlackIssuePayload,
} from "@repo/database/integrations/slack";

// ── Actions ──

export async function createIssueAction(
  input: z.input<typeof createIssueSchema>,
): Promise<{ success: true; id: string } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = createIssueSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  try {
    await assertProjectAccess(user.id, parsed.data.project_id);
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: "Geen toegang tot dit project" };
    throw e;
  }

  const result = await insertIssue(parsed.data);
  if ("error" in result) return { error: "Issue aanmaken mislukt" };

  await insertActivity({
    issue_id: result.data.id,
    actor_id: user.id,
    action: "created",
  });

  // Fire-and-forget AI classification (not awaited)
  classifyIssueBackground(result.data.id);

  revalidatePath("/issues");
  return { success: true, id: result.data.id };
}

export async function updateIssueAction(
  input: z.input<typeof updateIssueSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = updateIssueSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const { id, ...data } = parsed.data;

  const current = await getIssueById(id);
  if (!current) return { error: "Issue niet gevonden" };

  // Info-leak prevention (SEC-157 / EDGE-150): return "not found" rather
  // than "no access" so the client can't probe which issues exist.
  try {
    await assertProjectAccess(user.id, current.project_id);
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: "Issue niet gevonden" };
    throw e;
  }

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

  const result = await updateIssue(id, updateData);
  if ("error" in result) return { error: "Issue bijwerken mislukt" };

  const activityPromises: Promise<{ success: true } | { error: string }>[] = [];
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

  // Slack notification when priority is escalated to urgent
  if (data.priority === "urgent" && current.priority !== "urgent") {
    const slackEvent = resolveSlackEvent({
      type: result.data.type,
      severity: result.data.severity,
      priority: "urgent",
    });

    if (slackEvent) {
      const { getAdminClient } = await import("@repo/database/supabase/admin");
      const db = getAdminClient();
      const { data: project } = await db
        .from("projects")
        .select("name")
        .eq("id", current.project_id)
        .single();

      const payload: SlackIssuePayload = {
        issueId: id,
        issueNumber: current.issue_number,
        title: result.data.title,
        projectName: project?.name ?? "Onbekend project",
        severity: result.data.severity,
        priority: "urgent",
        type: result.data.type,
        component: result.data.component,
        trigger: "priority_change",
      };

      notifySlackIfUrgent(current.project_id, slackEvent, payload).catch((err) =>
        console.error("[updateIssueAction] Slack notification failed:", err),
      );
    }
  }

  revalidatePath("/issues");
  revalidatePath(`/issues/${id}`);
  return { success: true };
}

export async function deleteIssueAction(
  input: z.input<typeof deleteIssueSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = deleteIssueSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const current = await getIssueById(parsed.data.id);
  if (!current) return { error: "Issue niet gevonden" };

  try {
    await assertProjectAccess(user.id, current.project_id);
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: "Issue niet gevonden" };
    throw e;
  }

  const result = await deleteIssue(parsed.data.id);
  if ("error" in result) return { error: "Issue verwijderen mislukt" };

  revalidatePath("/issues");
  return { success: true };
}

const projectIdSchema = z.string().uuid();

/**
 * Get issue counts per status for sidebar display.
 */
export async function getIssueCountsAction(
  projectId: string,
): Promise<{ data: Record<string, number> } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = projectIdSchema.safeParse(projectId);
  if (!parsed.success) return { error: "Ongeldig project ID" };

  try {
    await assertProjectAccess(user.id, parsed.data);
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: "Geen toegang tot dit project" };
    throw e;
  }

  try {
    const counts = await getIssueCounts(parsed.data);
    return { data: counts };
  } catch (err) {
    console.error("[getIssueCountsAction]", err);
    return { error: "Counts ophalen mislukt" };
  }
}

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getIssueById } from "@repo/database/queries/issues";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { assertProjectAccess, NotAuthorizedError } from "@repo/auth/access";
import { updateIssue, insertActivity } from "@repo/database/mutations/issues";
import { runIssueClassifier } from "@repo/ai/agents/issue-classifier";
import {
  resolveSlackEvent,
  notifySlackIfUrgent,
  type SlackIssuePayload,
} from "@repo/database/integrations/slack";

const classifySchema = z.object({
  id: z.string().uuid(),
});

/**
 * Core classification logic shared by interactive and background classify.
 * Runs the AI classifier, updates the issue, and logs activity.
 */
async function classifyIssueCore(
  issueId: string,
  actorId?: string,
): Promise<{ success: true } | { error: string }> {
  const issue = await getIssueById(issueId);
  if (!issue) return { error: "Issue niet gevonden" };

  const result = await runIssueClassifier({
    title: issue.title,
    description: issue.description ?? "",
    page_url: issue.source_url ?? null,
    original_type:
      ((issue.source_metadata as Record<string, unknown> | null)?.feedbackType as string | null) ??
      null,
  });

  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = {
    ai_classification: {
      ...result,
      model: "claude-haiku-4-5",
      classified_at: now,
    },
    type: result.type,
    component: result.component,
    severity: result.severity,
    ai_classified_at: now,
  };

  const updateResult = await updateIssue(issueId, updateData);
  if ("error" in updateResult) return { error: updateResult.error };

  await insertActivity({
    issue_id: issueId,
    actor_id: actorId,
    action: "classified",
    metadata: {
      model: "claude-haiku-4-5",
      confidence: result.confidence,
    },
  });

  // Slack notification for urgent bugs (fire-and-forget)
  const slackEvent = resolveSlackEvent({
    type: result.type,
    severity: result.severity,
    priority: issue.priority,
  });

  if (slackEvent) {
    const { getAdminClient } = await import("@repo/database/supabase/admin");
    const db = getAdminClient();
    const { data: project } = await db
      .from("projects")
      .select("name")
      .eq("id", issue.project_id)
      .single();

    const payload: SlackIssuePayload = {
      issueId,
      issueNumber: issue.issue_number,
      title: issue.title,
      projectName: project?.name ?? "Onbekend project",
      severity: result.severity,
      priority: issue.priority,
      type: result.type,
      component: result.component,
      trigger: "classification",
    };

    // Don't await — fire-and-forget so classification isn't slowed down
    notifySlackIfUrgent(issue.project_id, slackEvent, payload).catch((err) =>
      console.error("[classifyIssueCore] Slack notification failed:", err),
    );
  }

  return { success: true };
}

/**
 * Classify an issue using AI (interactive, authenticated).
 */
export async function classifyIssueAction(
  input: z.input<typeof classifySchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = classifySchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldig issue ID" };

  const target = await getIssueById(parsed.data.id);
  if (!target) return { error: "Issue niet gevonden" };
  try {
    await assertProjectAccess(user.id, target.project_id);
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: "Issue niet gevonden" };
    throw e;
  }

  try {
    const result = await classifyIssueCore(parsed.data.id, user.id);
    if ("error" in result) return result;

    revalidatePath("/issues");
    revalidatePath(`/issues/${parsed.data.id}`);
    return { success: true };
  } catch (err) {
    console.error("[classifyIssueAction]", err);
    return { error: "Classificatie mislukt" };
  }
}

/**
 * Fire-and-forget classification. Called after issue creation.
 * Does not throw — errors are logged silently.
 */
export async function classifyIssueBackground(issueId: string): Promise<void> {
  try {
    await classifyIssueCore(issueId);
  } catch (err) {
    console.error("[classifyIssueBackground]", err);
  }
}

const bulkClassifySchema = z.object({
  projectId: z.string().uuid(),
});

/**
 * Reclassify all issues in triage for a project.
 * Runs sequentially to avoid rate limits.
 */
export async function bulkReclassifyAction(
  input: z.input<typeof bulkClassifySchema>,
): Promise<{ success: true; classified: number; failed: number } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = bulkClassifySchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldig project ID" };

  try {
    await assertProjectAccess(user.id, parsed.data.projectId);
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: "Geen toegang tot dit project" };
    throw e;
  }

  try {
    const { listIssues } = await import("@repo/database/queries/issues");
    const issues = await listIssues({
      projectId: parsed.data.projectId,
      status: ["triage"],
      limit: 100,
    });

    let classified = 0;
    let failed = 0;

    for (const issue of issues) {
      const result = await classifyIssueCore(issue.id, user.id);
      if ("success" in result) {
        classified++;
      } else {
        failed++;
        console.error(`[bulkReclassify] Issue ${issue.id} failed:`, result.error);
      }
    }

    revalidatePath("/issues");
    revalidatePath("/");
    return { success: true, classified, failed };
  } catch (err) {
    console.error("[bulkReclassifyAction]", err);
    return { error: "Bulk classificatie mislukt" };
  }
}

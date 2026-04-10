"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getIssueById } from "@repo/database/queries/issues";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { updateIssue, insertActivity } from "@repo/database/mutations/issues";
import { runIssueClassifier } from "@repo/ai/agents/issue-classifier";

const classifySchema = z.object({
  id: z.string().uuid(),
});

/**
 * Core classification logic shared by interactive and background classify.
 * Runs the AI classifier, updates the issue, and logs activity.
 */
async function classifyIssueCore(issueId: string, actorId?: string): Promise<void> {
  const issue = await getIssueById(issueId);
  if (!issue) throw new Error("Issue niet gevonden");

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
    component: result.component,
    severity: result.severity,
    ai_classified_at: now,
  };

  // For manual issues, also set type
  if (issue.source === "manual") {
    updateData.type = result.type;
  }

  await updateIssue(issueId, updateData);

  await insertActivity({
    issue_id: issueId,
    actor_id: actorId,
    action: "classified",
    metadata: {
      model: "claude-haiku-4-5",
      confidence: result.confidence,
    },
  });
}

/**
 * Classify an issue using AI (interactive, authenticated).
 * Updates ai_classification, component, severity, and ai_classified_at.
 */
export async function classifyIssueAction(
  input: z.input<typeof classifySchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = classifySchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldig issue ID" };

  try {
    await classifyIssueCore(parsed.data.id, user.id);

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

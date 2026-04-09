"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import { getIssueById } from "@repo/database/queries/issues";
import { updateIssue, insertActivity } from "@repo/database/mutations/issues";
import { runIssueClassifier } from "@repo/ai/agents/issue-classifier";

const classifySchema = z.object({
  id: z.string().uuid(),
});

/**
 * Classify an issue using AI. Updates ai_classification, component, severity,
 * and ai_classified_at. Logs a 'classified' activity entry.
 *
 * For manual issues (source='manual'), also sets the type if it wasn't set.
 */
export async function classifyIssueAction(
  input: z.input<typeof classifySchema>,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = classifySchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldig issue ID" };

  try {
    const issue = await getIssueById(parsed.data.id);
    if (!issue) return { error: "Issue niet gevonden" };

    const result = await runIssueClassifier({
      title: issue.title,
      description: issue.description ?? "",
      page_url: issue.source_url ?? null,
      original_type:
        ((issue.source_metadata as Record<string, unknown> | null)?.feedbackType as
          | string
          | null) ?? null,
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

    // For manual issues, also set type if not explicitly set
    if (issue.source === "manual") {
      updateData.type = result.type;
    }

    await updateIssue(parsed.data.id, updateData);

    await insertActivity({
      issue_id: parsed.data.id,
      actor_id: user.id,
      action: "classified",
      metadata: {
        model: "claude-haiku-4-5",
        confidence: result.confidence,
      },
    });

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
    const issue = await getIssueById(issueId);
    if (!issue) return;

    const result = await runIssueClassifier({
      title: issue.title,
      description: issue.description ?? "",
      page_url: issue.source_url ?? null,
      original_type:
        ((issue.source_metadata as Record<string, unknown> | null)?.feedbackType as
          | string
          | null) ?? null,
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
      action: "classified",
      metadata: {
        model: "claude-haiku-4-5",
        confidence: result.confidence,
      },
    });
  } catch (err) {
    console.error("[classifyIssueBackground]", err);
  }
}

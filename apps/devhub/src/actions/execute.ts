"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getIssueById } from "@repo/database/queries/issues";
import { updateIssue, insertActivity } from "@repo/database/mutations/issues";
import { runIssueExecutor } from "@repo/ai/agents/issue-executor";
import { getAuthenticatedUser } from "@repo/auth/helpers";

const executeSchema = z.object({
  issueId: z.string().uuid(),
});

/**
 * When an issue is moved to "in_progress", AI generates an execution plan
 * and then simulates progressing through the steps.
 */
export async function startAiExecution(
  input: z.input<typeof executeSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = executeSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldig issue ID" };

  try {
    const issue = await getIssueById(parsed.data.issueId);
    if (!issue) return { error: "Issue niet gevonden" };

    // Get repro steps from AI classification if available
    const aiClassification = issue.ai_classification as Record<string, unknown> | null;
    const reproSteps =
      typeof aiClassification?.repro_steps === "string" ? aiClassification.repro_steps : null;

    // Generate execution plan
    const plan = await runIssueExecutor({
      title: issue.title,
      description: issue.description,
      type: issue.type,
      component: issue.component,
      severity: issue.severity,
      repro_steps: reproSteps,
    });

    // Save plan with first step "in_progress"
    const stepsWithProgress = plan.steps.map((step, i) => ({
      ...step,
      status: i === 0 ? "in_progress" : "pending",
    }));

    await updateIssue(parsed.data.issueId, {
      execution_type: "ai",
      ai_executable: true,
      ai_context: {
        analysis: plan.analysis,
        approach: plan.approach,
        complexity: plan.complexity,
        affected_files: plan.affected_files,
        estimated_total_minutes: plan.estimated_total_minutes,
      },
      ai_result: {
        steps: stepsWithProgress,
        started_at: new Date().toISOString(),
        current_step: 0,
        status: "executing",
      },
    });

    await insertActivity({
      issue_id: parsed.data.issueId,
      actor_id: user.id,
      action: "ai_started",
      metadata: {
        complexity: plan.complexity,
        estimated_minutes: plan.estimated_total_minutes,
        step_count: plan.steps.length,
      },
    });

    revalidatePath(`/issues/${parsed.data.issueId}`);

    // Simulate step progression in the background
    simulateStepProgression(parsed.data.issueId, stepsWithProgress.length);

    return { success: true };
  } catch (err) {
    console.error("[startAiExecution]", err);
    return { error: "AI executie starten mislukt" };
  }
}

/**
 * Simulate AI progressing through steps (fire-and-forget).
 * Each step takes 4-8 seconds for demo purposes.
 */
async function simulateStepProgression(issueId: string, totalSteps: number) {
  for (let i = 0; i < totalSteps; i++) {
    // Wait 4-8 seconds per step
    const delay = 4000 + Math.random() * 4000;
    await new Promise((r) => setTimeout(r, delay));

    try {
      const issue = await getIssueById(issueId);
      if (!issue) return;

      const aiResult = issue.ai_result as Record<string, unknown> | null;
      if (!aiResult || aiResult.status !== "executing") return;

      const steps = (aiResult.steps as Array<Record<string, unknown>>) ?? [];

      // Mark current step as done, next step as in_progress
      const updatedSteps = steps.map((step, idx) => ({
        ...step,
        status: idx < i + 1 ? "done" : idx === i + 1 ? "in_progress" : step.status,
      }));

      const isLastStep = i === totalSteps - 1;

      await updateIssue(issueId, {
        ai_result: {
          ...aiResult,
          steps: updatedSteps,
          current_step: isLastStep ? totalSteps : i + 1,
          status: isLastStep ? "completed" : "executing",
          ...(isLastStep ? { completed_at: new Date().toISOString() } : {}),
        },
      });

      if (isLastStep) {
        await insertActivity({
          issue_id: issueId,
          action: "ai_completed",
          metadata: { steps_completed: totalSteps },
        });
      }

      revalidatePath(`/issues/${issueId}`);
    } catch (err) {
      console.error("[simulateStepProgression] step error:", err);
    }
  }
}

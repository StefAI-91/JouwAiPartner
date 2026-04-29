"use server";

import { z } from "zod";
import { getAuthenticatedUser, createPageClient } from "@repo/auth/helpers";
import { listAccessibleProjectIds } from "@repo/auth/access";
import { listIssues } from "@repo/database/queries/issues";
import { listOpenTopicsForCluster } from "@repo/database/queries/topics";
import { runBulkClusterCleanup } from "@repo/ai/agents/bulk-cluster-cleanup";
import type { BulkClusterOutput } from "@repo/ai/validations/bulk-cluster-cleanup";
import { TOPIC_TYPES } from "@repo/database/constants/topics";
import { createTopicAction } from "@/features/topics/actions/topics";
import { linkIssueAction } from "@/features/topics/actions/linking";

/**
 * PR-019 — On-demand batch-tool voor het opruimen van de "Niet gegroepeerd"-
 * view. Eén Haiku-call per project, niet-persistent. Drie actions:
 *  - `runBulkClusterCleanupAction`: clustert ungrouped open issues
 *  - `acceptClusterToExistingAction`: hergebruikt `linkIssueAction` per issue
 *  - `acceptClusterAsNewAction`: hergebruikt `createTopicAction` + `linkIssueAction`
 *
 * Hergebruik is letterlijk: geen duplicate Zod, geen duplicate revalidate.
 */

const projectIdSchema = z.object({ projectId: z.string().uuid() });

const acceptToExistingSchema = z.object({
  topicId: z.string().uuid(),
  issueIds: z.array(z.string().uuid()).min(1),
});

const acceptAsNewSchema = z.object({
  projectId: z.string().uuid(),
  topicPayload: z.object({
    title: z.string().min(3).max(200),
    description: z.string().min(10).max(5000),
    type: z.enum(TOPIC_TYPES),
  }),
  issueIds: z.array(z.string().uuid()).min(1),
});

const RUN_RESULT_LIMIT = 200;
// Description-clip — comment voor lezers: dit is bewust ruwe data afgekapt
// op een arbitraire grens (zie sprint design decision 5). Verleng naar 800
// als signaal-loss optreedt in productie.
const DESCRIPTION_CLIP_CHARS = 400;

export type BulkClusterRunResult =
  | { clusters: BulkClusterOutput["clusters"]; droppedExpired: number }
  | { error: string };

async function checkProjectAccess(
  projectId: string,
): Promise<
  | { user: { id: string }; supabase: Awaited<ReturnType<typeof createPageClient>> }
  | { error: string }
> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const supabase = await createPageClient();
  const accessible = await listAccessibleProjectIds(user.id, supabase);
  if (!accessible.includes(projectId)) return { error: "Geen toegang tot dit project" };

  return { user: { id: user.id }, supabase };
}

export async function runBulkClusterCleanupAction(input: {
  projectId: string;
}): Promise<BulkClusterRunResult> {
  const parsed = projectIdSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const access = await checkProjectAccess(parsed.data.projectId);
  if ("error" in access) return access;
  const { supabase } = access;

  // Hardgecodeerd filter — onafhankelijk van wat de UI in de filters heeft
  // staan. Ungrouped + open. Cap op 200 issues per run; voor jullie schaal
  // genoeg, en het Haiku-context-budget blijft veilig.
  const issues = await listIssues(
    {
      projectId: parsed.data.projectId,
      status: ["triage", "backlog", "todo", "in_progress"],
      ungroupedOnly: true,
      limit: RUN_RESULT_LIMIT,
      offset: 0,
    },
    supabase,
  );
  if (issues.length === 0) return { clusters: [], droppedExpired: 0 };

  const topics = await listOpenTopicsForCluster(parsed.data.projectId, supabase);

  const result = await runBulkClusterCleanup({
    issues: issues.map((i) => ({
      id: i.id,
      number: i.issue_number,
      title: i.title,
      description: i.description ? i.description.slice(0, DESCRIPTION_CLIP_CHARS) : null,
      ai_classification: i.ai_classification ?? null,
    })),
    topics: topics.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      type: t.type,
      status: t.status,
    })),
  });

  // Race-condition guard: als een topic tussen call en accept verdwenen is,
  // filter dat cluster eruit. UI kan een banner tonen als droppedExpired > 0.
  const validTopicIds = new Set(topics.map((t) => t.id));
  let droppedExpired = 0;
  const clusters = result.clusters.filter((c) => {
    if (c.kind === "new") return true;
    if (validTopicIds.has(c.match_topic_id)) return true;
    droppedExpired += 1;
    return false;
  });

  return { clusters, droppedExpired };
}

export async function acceptClusterToExistingAction(input: {
  topicId: string;
  issueIds: string[];
}): Promise<{ success: true; linked: number } | { error: string }> {
  const parsed = acceptToExistingSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  // Geen eigen project-access-check: linkIssueAction doet zelf auth +
  // assertProjectAccess via het topic. Hergebruik één-op-één conform sprint.
  let linked = 0;
  for (const issueId of parsed.data.issueIds) {
    const result = await linkIssueAction({
      topic_id: parsed.data.topicId,
      issue_id: issueId,
    });
    if ("error" in result) return { error: result.error };
    linked += 1;
  }
  return { success: true, linked };
}

export async function acceptClusterAsNewAction(input: {
  projectId: string;
  topicPayload: { title: string; description: string; type: "bug" | "feature" };
  issueIds: string[];
}): Promise<{ success: true; topicId: string; linked: number } | { error: string }> {
  const parsed = acceptAsNewSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const created = await createTopicAction({
    project_id: parsed.data.projectId,
    title: parsed.data.topicPayload.title,
    description: parsed.data.topicPayload.description,
    type: parsed.data.topicPayload.type,
  });
  if ("error" in created) return { error: created.error };

  const newTopicId = created.data.id;

  let linked = 0;
  for (const issueId of parsed.data.issueIds) {
    const result = await linkIssueAction({
      topic_id: newTopicId,
      issue_id: issueId,
    });
    if ("error" in result) return { error: result.error };
    linked += 1;
  }
  return { success: true, topicId: newTopicId, linked };
}

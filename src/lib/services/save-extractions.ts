import { GatekeeperOutput } from "@/lib/validations/gatekeeper";
import { resolveAllEntities, resolveProject } from "@/lib/services/entity-resolution";
import { updateMeetingProject } from "@/lib/actions/meetings";
import { insertDecision } from "@/lib/actions/decisions";
import { insertActionItem } from "@/lib/actions/action-items";
import { runImpactCheck } from "@/lib/services/impact-check";

/**
 * Save all extracted data from the Gatekeeper output to the database.
 * Runs entity resolution first, then inserts with correct project_id linkage.
 */
export async function saveExtractions(
  gatekeeperResult: GatekeeperOutput,
  meetingId: string,
): Promise<{
  decisions_saved: number;
  action_items_saved: number;
  pending_matches_created: number;
}> {
  let pendingMatchesCreated = 0;

  // Step 1: Resolve all entities
  const entityResolutions = await resolveAllEntities(
    gatekeeperResult.entities,
    meetingId,
    "meetings",
  );

  // Step 2: Determine meeting's primary project
  let meetingProjectId: string | null = null;

  if (gatekeeperResult.project_updates.length > 0) {
    meetingProjectId = entityResolutions.get(gatekeeperResult.project_updates[0].project) || null;
  }

  if (!meetingProjectId && gatekeeperResult.entities.projects.length > 0) {
    meetingProjectId = entityResolutions.get(gatekeeperResult.entities.projects[0]) || null;
  }

  // Update meeting with project_id
  if (meetingProjectId) {
    await updateMeetingProject(meetingId, meetingProjectId);
  }

  // Step 3: Save decisions + run impact check
  for (const decision of gatekeeperResult.decisions) {
    await insertDecision({
      decision: decision.decision,
      context: null,
      made_by: decision.made_by,
      source_type: "meeting",
      source_id: meetingId,
      project_id: meetingProjectId,
      date: new Date().toISOString(),
      status: "active",
      embedding_stale: true,
    });

    // Impact check: detect conflicts with existing decisions/meetings
    const impactResult = await runImpactCheck(decision.decision, meetingId);
    if (impactResult.conflicts_found > 0) {
      console.log(
        `Impact check: ${impactResult.conflicts_found} conflicts, ` +
          `${impactResult.suggestions_created} suggestions created`,
      );
    }
  }

  // Step 4: Save action items with scope and project_id
  for (const item of gatekeeperResult.action_items) {
    let actionProjectId: string | null = null;

    if (item.scope === "project" && item.project) {
      const resolution = await resolveProject(item.project);
      actionProjectId = resolution.project_id;

      if (!resolution.matched) {
        pendingMatchesCreated++;
      }
    }

    await insertActionItem({
      description: item.description,
      assignee: item.assignee || null,
      due_date: item.deadline || null,
      scope: item.scope,
      status: "open",
      source_type: "meeting",
      source_id: meetingId,
      project_id: actionProjectId || meetingProjectId,
    });
  }

  // Count pending matches from entity resolution
  for (const [, projectId] of entityResolutions) {
    if (projectId === null) pendingMatchesCreated++;
  }

  return {
    decisions_saved: gatekeeperResult.decisions.length,
    action_items_saved: gatekeeperResult.action_items.length,
    pending_matches_created: pendingMatchesCreated,
  };
}

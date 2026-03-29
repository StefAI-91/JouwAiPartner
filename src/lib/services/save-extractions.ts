import { resolveAllEntities } from "@/lib/services/entity-resolution";
import { updateMeetingProject } from "@/lib/actions/meetings";
import { insertDecision } from "@/lib/actions/decisions";
import { insertActionItem } from "@/lib/actions/action-items";
import { runImpactCheck } from "@/lib/services/impact-check";

/**
 * Extraction result from a future Extractor agent (sprint 5).
 * Decoupled from GatekeeperOutput since Gatekeeper now only classifies.
 */
interface ExtractionResult {
  entities: { people: string[]; projects: string[]; clients: string[]; topics: string[] };
  decisions: { decision: string; made_by: string }[];
  action_items: {
    description: string;
    assignee: string;
    deadline: string | null;
    scope: "project" | "personal";
    project: string | null;
  }[];
  project_updates: { project: string; status: string; blockers: string[] }[];
}

/**
 * Save all extracted data to the database.
 * Runs entity resolution first, then inserts with correct project_id linkage.
 * NOTE: Will be called by the Extractor agent in sprint 5, not by Gatekeeper.
 */
export async function saveExtractions(
  extractionResult: ExtractionResult,
  meetingId: string,
): Promise<{
  decisions_saved: number;
  action_items_saved: number;
  pending_matches_created: number;
}> {
  let pendingMatchesCreated = 0;

  // Step 1: Resolve all entities
  const entityResolutions = await resolveAllEntities(
    extractionResult.entities,
    meetingId,
    "meetings",
  );

  // Step 2: Determine meeting's primary project
  let meetingProjectId: string | null = null;

  if (extractionResult.project_updates.length > 0) {
    meetingProjectId = entityResolutions.get(extractionResult.project_updates[0].project) || null;
  }

  if (!meetingProjectId && extractionResult.entities.projects.length > 0) {
    meetingProjectId = entityResolutions.get(extractionResult.entities.projects[0]) || null;
  }

  // Update meeting with project_id
  if (meetingProjectId) {
    await updateMeetingProject(meetingId, meetingProjectId);
  }

  // Step 3: Save decisions + run impact check
  for (const decision of extractionResult.decisions) {
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
  // Reuse entityResolutions map instead of calling resolveProject again (avoids N+1)
  for (const item of extractionResult.action_items) {
    let actionProjectId: string | null = null;

    if (item.scope === "project" && item.project) {
      // Look up from already-resolved entities first
      actionProjectId = entityResolutions.get(item.project) ?? null;
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
    decisions_saved: extractionResult.decisions.length,
    action_items_saved: extractionResult.action_items.length,
    pending_matches_created: pendingMatchesCreated,
  };
}

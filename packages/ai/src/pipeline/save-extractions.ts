import { resolveAllEntities } from "./entity-resolution";
import { linkMeetingProject } from "@repo/database/mutations/meetings";
import { insertExtractions } from "@repo/database/mutations/extractions";
import { ExtractorOutput, ExtractionItem } from "../validations/extractor";

/**
 * Resolve the primary project ID from entity resolutions.
 */
function resolvePrimaryProject(
  extractorOutput: ExtractorOutput,
  entityResolutions: Map<string, string | null>,
): string | null {
  if (extractorOutput.primary_project) {
    const resolved = entityResolutions.get(extractorOutput.primary_project);
    if (resolved) return resolved;
  }

  for (const proj of extractorOutput.entities.projects) {
    const resolved = entityResolutions.get(proj);
    if (resolved) return resolved;
  }

  return null;
}

/**
 * Build extraction rows for batch insert from extractor output.
 */
function buildExtractionRows(
  extractions: ExtractionItem[],
  meetingId: string,
  entityResolutions: Map<string, string | null>,
  meetingProjectId: string | null,
) {
  return extractions.map((item: ExtractionItem) => {
    // Only assign project_id if the extraction explicitly mentions a project,
    // or if it's NOT a personal action item (personal items don't belong to a project)
    let projectId: string | null = null;

    if (item.project) {
      // Extraction explicitly references a project — resolve it
      projectId = entityResolutions.get(item.project) ?? meetingProjectId;
    } else if (item.type === "action_item" && item.scope === "personal") {
      // Personal action items don't belong to the meeting's project
      projectId = null;
    } else {
      // Decisions, needs, insights, and project-scoped action items
      // without an explicit project reference inherit the meeting's project
      projectId = meetingProjectId;
    }

    const metadata: Record<string, unknown> = {};
    if (item.assignee) metadata.assignee = item.assignee;
    if (item.deadline) metadata.deadline = item.deadline;
    if (item.scope) metadata.scope = item.scope;
    if (item.project) metadata.project = item.project;
    if (item.made_by) metadata.made_by = item.made_by;
    if (item.client) metadata.client = item.client;
    if (item.urgency) metadata.urgency = item.urgency;
    if (item.category) metadata.category = item.category;

    return {
      meeting_id: meetingId,
      type: item.type,
      content: item.content,
      confidence: item.confidence,
      transcript_ref: item.transcript_ref,
      metadata,
      project_id: projectId,
      embedding_stale: true,
      verification_status: "draft",
    };
  });
}

/**
 * Save all Extractor output to the unified `extractions` table.
 * Runs entity resolution for project/client linking.
 */
export async function saveExtractions(
  extractorOutput: ExtractorOutput,
  meetingId: string,
): Promise<{
  extractions_saved: number;
  project_linked: boolean;
}> {
  // Step 1: Resolve entities (projects + clients) for linking
  const entityResolutions = await resolveAllEntities(
    extractorOutput.entities,
    meetingId,
    "meetings",
  );

  // Step 2: Determine and link meeting's primary project
  const meetingProjectId = resolvePrimaryProject(extractorOutput, entityResolutions);
  if (meetingProjectId) {
    await linkMeetingProject(meetingId, meetingProjectId);
  }

  // Step 3: Build and insert extraction rows
  const rows = buildExtractionRows(
    extractorOutput.extractions,
    meetingId,
    entityResolutions,
    meetingProjectId,
  );

  if (rows.length > 0) {
    const result = await insertExtractions(rows);
    if ("error" in result) {
      console.error("Failed to insert extractions:", result.error);
      return { extractions_saved: 0, project_linked: !!meetingProjectId };
    }
  }

  return {
    extractions_saved: rows.length,
    project_linked: !!meetingProjectId,
  };
}

import { getAdminClient } from "@repo/database/supabase/admin";
import { resolveAllEntities } from "./entity-resolution";
import { linkMeetingProject } from "@repo/database/mutations/meetings";
import { ExtractorOutput, ExtractionItem } from "../validations/extractor";

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

  // Step 2: Determine and set meeting's primary project
  let meetingProjectId: string | null = null;

  if (extractorOutput.primary_project) {
    meetingProjectId = entityResolutions.get(extractorOutput.primary_project) ?? null;
  }

  // Fallback: first resolved project
  if (!meetingProjectId && extractorOutput.entities.projects.length > 0) {
    for (const proj of extractorOutput.entities.projects) {
      const resolved = entityResolutions.get(proj);
      if (resolved) {
        meetingProjectId = resolved;
        break;
      }
    }
  }

  if (meetingProjectId) {
    await linkMeetingProject(meetingId, meetingProjectId);
  }

  // Step 3: Build extraction rows for batch insert
  const rows = extractorOutput.extractions.map((item: ExtractionItem) => {
    // Resolve project_id for project-scoped items
    let projectId: string | null = null;
    if (item.type === "action_item" && item.project) {
      projectId = entityResolutions.get(item.project) ?? null;
    }

    // Build metadata JSONB from flat fields
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
      project_id: projectId || meetingProjectId,
      embedding_stale: true,
      verification_status: "draft",
    };
  });

  // Step 4: Batch insert all extractions
  if (rows.length > 0) {
    const { error } = await getAdminClient().from("extractions").insert(rows);

    if (error) {
      console.error("Failed to insert extractions:", error.message);
      return { extractions_saved: 0, project_linked: !!meetingProjectId };
    }
  }

  return {
    extractions_saved: rows.length,
    project_linked: !!meetingProjectId,
  };
}

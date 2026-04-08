import { linkAllMeetingProjects } from "@repo/database/mutations/meetings";
import { insertExtractions } from "@repo/database/mutations/extractions";
import { ExtractorOutput, ExtractionItem } from "../validations/extractor";
import type { IdentifiedProject } from "../validations/gatekeeper";

/**
 * Build a map of project_name -> project_id from Gatekeeper's identified projects.
 */
function buildProjectMap(identifiedProjects: IdentifiedProject[]): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const p of identifiedProjects) {
    map.set(p.project_name.toLowerCase(), p.project_id);
  }
  return map;
}

/**
 * Find the primary project from identified projects (highest confidence with a resolved ID).
 */
function findPrimaryProjectId(identifiedProjects: IdentifiedProject[]): string | null {
  const sorted = [...identifiedProjects]
    .filter((p) => p.project_id !== null)
    .sort((a, b) => b.confidence - a.confidence);
  return sorted[0]?.project_id ?? null;
}

/**
 * Build extraction rows for batch insert from extractor output.
 * Project assignment comes from Gatekeeper's identified projects (not Extractor).
 */
function buildExtractionRows(
  extractions: ExtractionItem[],
  meetingId: string,
  projectMap: Map<string, string | null>,
  primaryProjectId: string | null,
) {
  return extractions.map((item: ExtractionItem) => {
    let projectId: string | null = null;

    if (item.project) {
      // Extraction references a project name -> look up in Gatekeeper's project map
      projectId = projectMap.get(item.project.toLowerCase()) ?? null;
    } else if (item.type === "action_item" && item.scope === "personal") {
      // Personal action items don't belong to a project
      projectId = null;
    } else {
      // Project-scoped items without explicit project inherit the primary project
      projectId = primaryProjectId;
    }

    const metadata: Record<string, unknown> = {};
    if (item.category) metadata.category = item.category;
    if (item.follow_up_contact) metadata.follow_up_contact = item.follow_up_contact;
    if (item.assignee) metadata.assignee = item.assignee;
    if (item.deadline) metadata.deadline = item.deadline;
    if (item.suggested_deadline) metadata.suggested_deadline = item.suggested_deadline;
    if (item.effort_estimate) metadata.effort_estimate = item.effort_estimate;
    if (item.deadline_reasoning) metadata.deadline_reasoning = item.deadline_reasoning;
    if (item.scope) metadata.scope = item.scope;
    if (item.project) metadata.project = item.project;

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
 * Project-linking via Gatekeeper's identified_projects (FUNC-060).
 * Client resolution still via Extractor entities (FUNC-061).
 */
export async function saveExtractions(
  extractorOutput: ExtractorOutput,
  meetingId: string,
  identifiedProjects: IdentifiedProject[],
): Promise<{
  extractions_saved: number;
  projects_linked: number;
}> {
  // Step 1: Link ALL Gatekeeper projects to meeting (FUNC-062, FUNC-063)
  const linkResult = await linkAllMeetingProjects(meetingId, identifiedProjects);
  if (linkResult.errors.length > 0) {
    console.error("Failed to link some projects:", linkResult.errors);
  }

  // Step 2: Build project map + find primary for extraction assignment
  const projectMap = buildProjectMap(identifiedProjects);
  const primaryProjectId = findPrimaryProjectId(identifiedProjects);

  // Step 3: Build and insert extraction rows
  const rows = buildExtractionRows(
    extractorOutput.extractions,
    meetingId,
    projectMap,
    primaryProjectId,
  );

  if (rows.length > 0) {
    const result = await insertExtractions(rows);
    if ("error" in result) {
      console.error("Failed to insert extractions:", result.error);
      return { extractions_saved: 0, projects_linked: linkResult.linked };
    }
  }

  return {
    extractions_saved: rows.length,
    projects_linked: linkResult.linked,
  };
}

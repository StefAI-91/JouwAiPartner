import { linkAllMeetingProjects } from "@repo/database/mutations/meetings";
import {
  deleteExtractionsByMeetingAndType,
  insertExtractions,
  type ExtractionInsertRow,
} from "@repo/database/mutations/extractions";
import type { IdentifiedProject } from "../../validations/gatekeeper";
import type { RiskSpecialistItem, RiskSpecialistOutput } from "../../validations/risk-specialist";

/**
 * Schrijft RiskSpecialist-output naar de gedeelde `extractions`-tabel met
 * type=`risk`. Idempotent per meeting: bestaande risk-rijen worden eerst
 * gewist voordat de nieuwe set wordt weggeschreven, zodat een re-run niet
 * verdubbelt. Action_items + andere types blijven ongemoeid (delete filtert
 * op `type = 'risk'`).
 *
 * Project-mapping via Gatekeeper's `identifiedProjects` — identieke logica
 * als `saveExtractions`: match op `project`-naam, anders primary project,
 * anders null.
 */
export async function saveRiskExtractions(
  output: RiskSpecialistOutput,
  meetingId: string,
  identifiedProjects: IdentifiedProject[],
): Promise<{
  extractions_saved: number;
  projects_linked: number;
}> {
  const linkResult = await linkAllMeetingProjects(meetingId, identifiedProjects);
  if (linkResult.errors.length > 0) {
    console.error("[saveRiskExtractions] Failed to link some projects:", linkResult.errors);
  }

  const projectMap = buildProjectMap(identifiedProjects);
  const primaryProjectId = findPrimaryProjectId(identifiedProjects);

  const rows = buildRiskRows(output.risks, meetingId, projectMap, primaryProjectId);

  // Idempotent: wis eerst bestaande risk-rijen voor deze meeting. Bij 0 nieuwe
  // risks houden we geen oude rijen achter (agent gaf bewust niks terug).
  const deleteResult = await deleteExtractionsByMeetingAndType(meetingId, "risk");
  if ("error" in deleteResult) {
    console.error("[saveRiskExtractions] Failed to delete old risks:", deleteResult.error);
    return { extractions_saved: 0, projects_linked: linkResult.linked };
  }

  if (rows.length === 0) {
    return { extractions_saved: 0, projects_linked: linkResult.linked };
  }

  const insertResult = await insertExtractions(rows);
  if ("error" in insertResult) {
    console.error("[saveRiskExtractions] Failed to insert risks:", insertResult.error);
    return { extractions_saved: 0, projects_linked: linkResult.linked };
  }

  return { extractions_saved: insertResult.count, projects_linked: linkResult.linked };
}

function buildProjectMap(identifiedProjects: IdentifiedProject[]): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const p of identifiedProjects) {
    map.set(p.project_name.toLowerCase(), p.project_id);
  }
  return map;
}

function findPrimaryProjectId(identifiedProjects: IdentifiedProject[]): string | null {
  const sorted = [...identifiedProjects]
    .filter((p) => p.project_id !== null)
    .sort((a, b) => b.confidence - a.confidence);
  return sorted[0]?.project_id ?? null;
}

function buildRiskRows(
  risks: RiskSpecialistItem[],
  meetingId: string,
  projectMap: Map<string, string | null>,
  primaryProjectId: string | null,
): ExtractionInsertRow[] {
  return risks.map((r) => {
    let projectId: string | null = null;
    if (r.project) {
      projectId = projectMap.get(r.project.toLowerCase()) ?? primaryProjectId;
    } else {
      projectId = primaryProjectId;
    }

    const metadata: Record<string, unknown> = {};
    if (r.metadata.severity) metadata.severity = r.metadata.severity;
    if (r.metadata.category) metadata.category = r.metadata.category;
    if (r.metadata.jaip_impact_area) metadata.jaip_impact_area = r.metadata.jaip_impact_area;
    if (r.metadata.raised_by) metadata.raised_by = r.metadata.raised_by;
    if (r.theme) metadata.theme = r.theme;
    if (r.theme_project) metadata.theme_project = r.theme_project;
    if (r.project) metadata.project = r.project;

    return {
      meeting_id: meetingId,
      type: "risk",
      content: r.content,
      confidence: r.confidence,
      transcript_ref: r.source_quote,
      metadata,
      project_id: projectId,
      embedding_stale: true,
      verification_status: "draft",
      reasoning: r.reasoning,
    };
  });
}

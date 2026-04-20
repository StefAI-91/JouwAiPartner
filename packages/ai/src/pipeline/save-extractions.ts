import { linkAllMeetingProjects } from "@repo/database/mutations/meetings";
import { replaceMeetingExtractions } from "@repo/database/mutations/extractions";
import type { IdentifiedProject } from "../validations/gatekeeper";
import {
  validateKernpuntMetadata,
  type Kernpunt,
  type MeetingStructurerOutput,
} from "../validations/meeting-structurer";

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
 * Build extraction rows from MeetingStructurer kernpunten. Mirrors the legacy
 * mapping (project resolution + invariant fields) maar accepteert de 14-type
 * structured shape en valideert per-type metadata.
 *
 * Invalid metadata is logged and the row is still saved with an empty
 * metadata object — losing one optional field is preferable to dropping
 * the entire extraction (err on keeping).
 */
function buildStructuredRows(
  kernpunten: Kernpunt[],
  meetingId: string,
  projectMap: Map<string, string | null>,
  primaryProjectId: string | null,
) {
  return kernpunten.map((k) => {
    const validated = validateKernpuntMetadata(k);
    const metadata: Record<string, unknown> = validated.ok ? { ...validated.metadata } : {};

    if (!validated.ok) {
      console.warn(
        `[saveStructuredExtractions] metadata invalid for type=${k.type}: ${validated.error}`,
      );
    }

    if (k.theme) metadata.theme = k.theme;
    if (k.theme_project) metadata.theme_project = k.theme_project;
    if (k.project) metadata.project = k.project;

    let projectId: string | null = null;
    if (k.project) {
      projectId = projectMap.get(k.project.toLowerCase()) ?? null;
    } else if (k.type === "action_item" && metadata.scope === "personal") {
      projectId = null;
    } else {
      projectId = primaryProjectId;
    }

    return {
      meeting_id: meetingId,
      type: k.type,
      content: k.content,
      confidence: k.confidence,
      transcript_ref: k.source_quote,
      metadata,
      project_id: projectId,
      embedding_stale: true,
      verification_status: "draft",
      follow_up_context: k.type === "action_item" ? k.follow_up_context : null,
      reasoning: k.reasoning,
    };
  });
}

/**
 * Save MeetingStructurer output to the unified `extractions` table. Idempotent
 * via de `reset_extractions_for_meeting` RPC: een re-run op dezelfde meeting
 * laat exact één set extractions achter, geen duplicaten. DELETE+INSERT draait
 * in één transactie; bij een crash midden in de operatie blijft de DB
 * consistent.
 *
 * Vlaggetje `USE_MEETING_STRUCTURER` is momenteel uit in productie — deze
 * functie wordt alleen geraakt als iemand de flag expliciet aanzet. De
 * RiskSpecialist-save (`save-risk-extractions.ts`) staat los en is de actieve
 * extractie-bron.
 */
export async function saveStructuredExtractions(
  structurerOutput: MeetingStructurerOutput,
  meetingId: string,
  identifiedProjects: IdentifiedProject[],
): Promise<{
  extractions_saved: number;
  projects_linked: number;
}> {
  const linkResult = await linkAllMeetingProjects(meetingId, identifiedProjects);
  if (linkResult.errors.length > 0) {
    console.error("Failed to link some projects:", linkResult.errors);
  }

  const projectMap = buildProjectMap(identifiedProjects);
  const primaryProjectId = findPrimaryProjectId(identifiedProjects);

  const rows = buildStructuredRows(
    structurerOutput.kernpunten,
    meetingId,
    projectMap,
    primaryProjectId,
  );

  // Empty-rows is een no-op: als de agent 0 kernpunten teruggaf (bijv. na
  // een regressie) raken we de bestaande set niet kwijt. "Err on keeping" —
  // liever stale data dan silent verlies door een AI-hik.
  if (rows.length === 0) {
    return { extractions_saved: 0, projects_linked: linkResult.linked };
  }

  const result = await replaceMeetingExtractions(meetingId, rows);
  if ("error" in result) {
    console.error("Failed to replace extractions:", result.error);
    return { extractions_saved: 0, projects_linked: linkResult.linked };
  }

  return {
    extractions_saved: result.count,
    projects_linked: linkResult.linked,
  };
}

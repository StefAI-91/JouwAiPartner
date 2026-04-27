import { linkAllMeetingProjects } from "@repo/database/mutations/meetings";
import {
  deleteExtractionsByMeetingTypeAndSource,
  insertExtractions,
  type ExtractionInsertRow,
} from "@repo/database/mutations/extractions";
import type { IdentifiedProject } from "../validations/gatekeeper";
import type {
  ActionItemSpecialistItem,
  ActionItemSpecialistOutput,
} from "../validations/action-item-specialist";

/**
 * Source-marker waarmee specialist-rijen onderscheiden worden van handmatig
 * toegevoegde action_items (`apps/cockpit/.../add-extraction-form.tsx`).
 * Re-runs vervangen alleen rijen met deze marker.
 */
export const ACTION_ITEM_SPECIALIST_SOURCE = "action_item_specialist";

/**
 * Schrijft Action Item Specialist output naar de gedeelde `extractions`-
 * tabel met type='action_item'. Idempotent per meeting:
 *  - Replace only rijen met `metadata.source = 'action_item_specialist'`
 *    en `verification_status != 'verified'`. Handmatige rijen + al-
 *    geverifieerde specialist-rijen blijven staan (verification = waarheid).
 *
 * Project-mapping conform RiskSpecialist-pattern: match op `project_context`
 * naam tegen identifiedProjects (case-insensitive), fallback op primary
 * project, anders null.
 */
export async function saveActionItemExtractions(
  output: ActionItemSpecialistOutput,
  meetingId: string,
  identifiedProjects: IdentifiedProject[],
): Promise<{
  extractions_saved: number;
  extractions_replaced: number;
  projects_linked: number;
}> {
  const linkResult = await linkAllMeetingProjects(meetingId, identifiedProjects);
  if (linkResult.errors.length > 0) {
    console.error("[saveActionItemExtractions] Failed to link some projects:", linkResult.errors);
  }

  const projectMap = buildProjectMap(identifiedProjects);
  const primaryProjectId = findPrimaryProjectId(identifiedProjects);

  const rows = buildActionItemRows(output.items, meetingId, projectMap, primaryProjectId);

  // Replace alleen specialist-rijen die nog niet verified zijn. Bij 0
  // nieuwe items wissen we nog steeds bestaande specialist-drafts —
  // intent: "deze run zegt: geen action_items".
  const deleteResult = await deleteExtractionsByMeetingTypeAndSource(
    meetingId,
    "action_item",
    ACTION_ITEM_SPECIALIST_SOURCE,
  );
  if ("error" in deleteResult) {
    console.error("[saveActionItemExtractions] Failed to delete old items:", deleteResult.error);
    return {
      extractions_saved: 0,
      extractions_replaced: 0,
      projects_linked: linkResult.linked,
    };
  }

  if (rows.length === 0) {
    return {
      extractions_saved: 0,
      extractions_replaced: deleteResult.count,
      projects_linked: linkResult.linked,
    };
  }

  const insertResult = await insertExtractions(rows);
  if ("error" in insertResult) {
    console.error("[saveActionItemExtractions] Failed to insert items:", insertResult.error);
    return {
      extractions_saved: 0,
      extractions_replaced: deleteResult.count,
      projects_linked: linkResult.linked,
    };
  }

  return {
    extractions_saved: insertResult.count,
    extractions_replaced: deleteResult.count,
    projects_linked: linkResult.linked,
  };
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

function buildActionItemRows(
  items: ActionItemSpecialistItem[],
  meetingId: string,
  projectMap: Map<string, string | null>,
  primaryProjectId: string | null,
): ExtractionInsertRow[] {
  return items.map((i) => {
    let projectId: string | null = null;
    if (i.project_context) {
      projectId = projectMap.get(i.project_context.toLowerCase()) ?? primaryProjectId;
    } else {
      projectId = primaryProjectId;
    }

    // Metadata-shape per FUNC-112: alleen niet-null velden meegeven.
    // `assignee` en `deadline` keys zijn 1-op-1 wat MCP `get_action_items`
    // (packages/mcp/src/tools/actions.ts) leest — niet hernoemen.
    const metadata: Record<string, unknown> = {
      source: ACTION_ITEM_SPECIALIST_SOURCE,
      type_werk: i.type_werk,
      follow_up_contact: i.follow_up_contact,
      recipient_per_quote: i.recipient_per_quote,
      jaip_followup_action: i.jaip_followup_action,
    };
    if (i.assignee) metadata.assignee = i.assignee;
    if (i.deadline) metadata.deadline = i.deadline;
    if (i.follow_up_date) metadata.follow_up_date = i.follow_up_date;
    if (i.category) metadata.category = i.category;
    if (i.jaip_followup_quote) metadata.jaip_followup_quote = i.jaip_followup_quote;
    if (i.project_context) metadata.project_context = i.project_context;

    return {
      meeting_id: meetingId,
      type: "action_item",
      content: i.content,
      confidence: i.confidence,
      transcript_ref: i.source_quote,
      metadata,
      project_id: projectId,
      embedding_stale: true,
      verification_status: "draft",
      reasoning: i.reasoning,
    };
  });
}

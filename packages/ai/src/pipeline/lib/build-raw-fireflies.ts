import type { ParticipantInfo } from "../../agents/gatekeeper";
import type { GatekeeperOutput } from "../../validations/gatekeeper";

/**
 * Build the raw_fireflies JSONB metadata for a meeting.
 * Combines original Fireflies data with pipeline classification metadata.
 */
export function buildRawFireflies(
  originalData: Record<string, unknown> | undefined,
  classifiedParticipants: ParticipantInfo[],
  gatekeeperResult: GatekeeperOutput,
  partyTypeSource: string,
): Record<string, unknown> {
  return {
    ...(originalData ?? {}),
    pipeline: {
      participant_classification: classifiedParticipants.map((p) => ({
        raw: p.raw,
        label: p.label,
        matched_name: p.matchedName ?? null,
        organization_name: p.organizationName ?? null,
        organization_type: p.organizationType ?? null,
      })),
      party_type_source: partyTypeSource,
      gatekeeper: {
        meeting_type: gatekeeperResult.meeting_type,
        relevance_score: gatekeeperResult.relevance_score,
        reason: gatekeeperResult.reason,
        organization_name: gatekeeperResult.organization_name,
      },
      processed_at: new Date().toISOString(),
    },
  };
}

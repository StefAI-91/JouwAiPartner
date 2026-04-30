import { resolveOrganization } from "../lib/entity-resolution";
import { buildRawFireflies } from "../lib/build-raw-fireflies";
import { insertMeeting } from "@repo/database/mutations/meetings";
import { matchParticipants } from "../participant/helpers";
import type { ClassifyResult, MeetingInput, PersistResult } from "./types";

export type PersistOutcome = { ok: true; result: PersistResult } | { ok: false; error: string };

/**
 * Fase 2 — Persist: resolve organisatie, bouw raw_fireflies metadata, insert
 * de meeting-row, en koppel deelnemers. Een falende insert is een harde stop
 * voor de hoofdpijplijn — alle volgende fases hebben de meetingId nodig.
 */
export async function runPersistPhase(
  input: MeetingInput,
  classify: ClassifyResult,
): Promise<PersistOutcome> {
  const knownOrg = classify.classifiedParticipants.find(
    (p) => p.label === "external" && p.organizationName,
  );
  const orgNameToResolve =
    knownOrg?.organizationName ?? classify.gatekeeperResult.organization_name;
  const orgResult = await resolveOrganization(orgNameToResolve);

  const partyTypeSource = knownOrg ? "deterministic" : "gatekeeper_fallback";
  const rawFireflies = buildRawFireflies(
    input.raw_fireflies,
    classify.classifiedParticipants,
    classify.gatekeeperResult,
    partyTypeSource,
  );

  const pipelineAudit = rawFireflies.pipeline as Record<string, unknown>;
  pipelineAudit.rule_based_meeting_type = classify.ruleBasedType;
  pipelineAudit.meeting_type_source = classify.ruleBasedType ? "deterministic" : "gatekeeper";

  if (classify.speakerMap.size > 0) {
    pipelineAudit.speaker_map = [...classify.speakerMap.values()].map((s) => ({
      raw: s.raw,
      name: s.name,
      person_id: s.personId,
      label: s.label,
      role: s.role,
      organization_name: s.organizationName,
    }));
  }

  const insertResult = await insertMeeting({
    fireflies_id: input.fireflies_id,
    title: input.title,
    original_title: input.title,
    date: new Date(Number(input.date)).toISOString(),
    participants: input.participants,
    summary: input.summary,
    transcript: input.transcript,
    meeting_type: classify.finalMeetingType,
    party_type: classify.partyType,
    relevance_score: classify.gatekeeperResult.relevance_score,
    organization_id: orgResult.organization_id,
    unmatched_organization_name: orgResult.matched ? null : orgNameToResolve,
    raw_fireflies: rawFireflies,
    embedding_stale: true,
    verification_status: "draft",
    organizer_email: input.organizer_email ?? null,
  });

  if ("error" in insertResult) {
    console.error("Meeting insert error:", insertResult.error);
    return { ok: false, error: insertResult.error };
  }

  const meetingId = insertResult.data.id;

  await matchParticipants(
    meetingId,
    input.participants,
    input.meeting_attendees,
    classify.speakerMap,
  );

  return {
    ok: true,
    result: {
      meetingId,
      organizationId: orgResult.organization_id,
      organizationMatched: orgResult.matched,
      orgNameToResolve,
      knownOrgName: knownOrg?.organizationName ?? null,
    },
  };
}

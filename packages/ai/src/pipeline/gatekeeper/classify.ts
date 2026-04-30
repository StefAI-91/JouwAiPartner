import { runGatekeeper, type ParticipantInfo } from "../../agents/gatekeeper";
import {
  classifyParticipantsWithCache,
  determinePartyType,
  determineRuleBasedMeetingType,
} from "../participant/classifier";
import { mergeParticipantSources } from "../participant/helpers";
import { getAllKnownPeople } from "@repo/database/queries/people";
import { buildEntityContext } from "../lib/context-injection";
import { extractSpeakerNames, buildSpeakerMap, formatSpeakerContext } from "../lib/speaker-map";
import type { ClassifyResult, MeetingInput } from "./types";

/**
 * Fase 1 — Classify: bouwt deelnemer-context, roept de Gatekeeper-agent aan,
 * en derive party-type + rule-based meeting-type. Geen DB-mutaties.
 *
 * Board-detectie loopt via de `isAdmin`-vlag op `ParticipantInfo` — consistent
 * met de deterministische `determineRuleBasedMeetingType` override. De
 * Gatekeeper zelf kiest alleen wanneer er geen rule-based match is.
 */
export async function runClassifyPhase(input: MeetingInput): Promise<ClassifyResult> {
  const allParticipantStrings = mergeParticipantSources(
    input.participants,
    input.meeting_attendees,
  );
  const [knownPeople, entityContext] = await Promise.all([
    getAllKnownPeople(),
    buildEntityContext(),
  ]);
  const classifiedParticipants = classifyParticipantsWithCache(allParticipantStrings, knownPeople);

  const speakerNames = input.sentences ? extractSpeakerNames(input.sentences) : [];
  const speakerMap = buildSpeakerMap(speakerNames, knownPeople);
  const speakerContext = speakerMap.size > 0 ? formatSpeakerContext(speakerMap) : null;

  const adminIds = new Set(knownPeople.filter((p) => p.is_admin).map((p) => p.id));
  const gatekeeperParticipants: ParticipantInfo[] =
    speakerMap.size > 0
      ? [...speakerMap.values()].map((s) => ({
          raw: s.raw,
          label: s.label,
          matchedName: s.name !== s.raw ? s.name : undefined,
          organizationName: s.organizationName,
          isAdmin: s.personId ? adminIds.has(s.personId) : false,
        }))
      : classifiedParticipants;

  const gatekeeperResult = await runGatekeeper(input.summary, {
    title: input.title,
    participants: gatekeeperParticipants,
    date: input.date,
    topics: input.topics,
    entityContext: entityContext.contextString,
  });

  const ruleBasedType = determineRuleBasedMeetingType(classifiedParticipants);
  const finalMeetingType = ruleBasedType ?? gatekeeperResult.meeting_type;
  const partyType = determinePartyType(classifiedParticipants, finalMeetingType);

  return {
    classifiedParticipants,
    knownPeople,
    speakerMap,
    speakerContext,
    entityContext,
    gatekeeperResult,
    finalMeetingType,
    ruleBasedType,
    partyType,
    identifiedProjects: gatekeeperResult.identified_projects,
  };
}

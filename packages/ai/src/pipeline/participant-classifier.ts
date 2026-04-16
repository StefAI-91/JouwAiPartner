import type { ParticipantInfo } from "../agents/gatekeeper";
import type { MeetingType, PartyType } from "../validations/gatekeeper";
import type { KnownPerson } from "@repo/database/queries/people";
import { getAllKnownPeople } from "@repo/database/queries/people";

// Email domains that are always internal (regardless of people table)
const INTERNAL_DOMAINS = ["jouwaipartner.nl", "jaip.nl"];

/**
 * Normalize raw participant strings: split comma-separated entries and deduplicate.
 */
function normalizeParticipants(rawParticipants: string[]): string[] {
  const split = rawParticipants.flatMap((p) =>
    p.includes(",")
      ? p
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [p],
  );
  return [...new Set(split.map((p) => p.toLowerCase().trim()))];
}

/**
 * Classify a single participant against known people + internal domains.
 */
function classifySingle(normalized: string, knownPeople: KnownPerson[]): ParticipantInfo {
  const match =
    knownPeople.find((p) => p.email && p.email.toLowerCase() === normalized) ??
    knownPeople.find((p) => p.name.toLowerCase() === normalized);

  if (match) {
    if (match.team) {
      return {
        raw: normalized,
        label: "internal",
        matchedName: match.name,
        isAdmin: match.is_admin,
      };
    }
    return {
      raw: normalized,
      label: "external",
      matchedName: match.name,
      organizationName: match.organization_name,
      organizationType: match.organization_type,
      isAdmin: match.is_admin,
    };
  }

  // Fallback: check if email domain is internal
  const domain = normalized.includes("@") ? normalized.split("@")[1] : null;
  if (domain && INTERNAL_DOMAINS.includes(domain)) {
    return { raw: normalized, label: "internal", isAdmin: false };
  }

  return { raw: normalized, label: "unknown", isAdmin: false };
}

/**
 * Classify participants as internal/external by matching against the people table.
 * Fetches known people from the database. Use classifyParticipantsWithCache
 * if you already have the people list.
 */
export async function classifyParticipants(rawParticipants: string[]): Promise<ParticipantInfo[]> {
  const knownPeople = await getAllKnownPeople();
  return classifyParticipantsWithCache(rawParticipants, knownPeople);
}

/**
 * Classify participants using a pre-fetched known people list (avoids repeated DB calls).
 */
export function classifyParticipantsWithCache(
  rawParticipants: string[],
  knownPeople: KnownPerson[],
): ParticipantInfo[] {
  const unique = normalizeParticipants(rawParticipants);
  return unique.map((normalized) => classifySingle(normalized, knownPeople));
}

/**
 * Bestuurlijke meeting? True als minstens één deelnemer is, en alle classified
 * participants intern + admin zijn. Sprint 035 — board-meetings.
 *
 * NB: alleen "internal" telt mee. Eén "unknown" of niet-admin participant
 * laat de pipeline terugvallen op de standaard meeting_type-classificatie.
 */
export function isBoardMeeting(participants: ParticipantInfo[]): boolean {
  if (participants.length === 0) return false;
  return participants.every((p) => p.label === "internal" && p.isAdmin === true);
}

/**
 * Determine meeting type deterministically from classified participants.
 * Returns null when AI should decide. Rules (first match wins):
 * 1. All internal + all admin → board
 * 2. All internal, 3+ people → team_sync
 * 3. All internal, exactly 2 → one_on_one
 * 4. All non-internal participants are unknown (nobody recognized) → discovery
 * 5. Otherwise → null (AI decides)
 */
export function determineRuleBasedMeetingType(participants: ParticipantInfo[]): MeetingType | null {
  if (participants.length === 0) return null;

  const allInternal = participants.every((p) => p.label === "internal");

  if (allInternal) {
    if (participants.every((p) => p.isAdmin === true)) return "board";
    if (participants.length >= 3) return "team_sync";
    return "one_on_one";
  }

  // External participants present — check if any are recognized
  const nonInternal = participants.filter((p) => p.label !== "internal");
  if (nonInternal.every((p) => p.label === "unknown")) return "discovery";

  return null;
}

/**
 * Determine party_type deterministically from classified participants + meeting type.
 * Rules (first match wins):
 * 1. All internal → "internal"
 * 2. Known external with org type "client" → "client"
 * 3. Known external with org type "partner" → "partner"
 * 4. Meeting type = discovery/sales/status_update/project_kickoff → "client"
 * 5. Meeting type = collaboration → "partner"
 * 6. Otherwise → "other"
 */
export function determinePartyType(
  participants: ParticipantInfo[],
  meetingType?: MeetingType | null,
): PartyType {
  if (participants.length === 0) return "other";
  if (participants.every((p) => p.label === "internal")) return "internal";

  const knownExternal = participants.find((p) => p.label === "external" && p.organizationType);
  if (knownExternal?.organizationType === "client") return "client";
  if (knownExternal?.organizationType === "partner") return "partner";

  // Fallback: infer from meeting type
  if (
    meetingType === "discovery" ||
    meetingType === "sales" ||
    meetingType === "status_update" ||
    meetingType === "project_kickoff"
  ) {
    return "client";
  }
  if (meetingType === "collaboration") return "partner";

  return "other";
}

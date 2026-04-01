import type { ParticipantInfo } from "../agents/gatekeeper";
import type { PartyType } from "../validations/gatekeeper";
import type { KnownPerson } from "@repo/database/queries/people";
import { getAllKnownPeople } from "@repo/database/queries/people";

// Email domains that are always internal (regardless of people table)
const INTERNAL_DOMAINS = ["jouwaipartner.nl", "jaip.nl"];

/**
 * Normalize raw participant strings: split comma-separated entries and deduplicate.
 */
function normalizeParticipants(rawParticipants: string[]): string[] {
  const split = rawParticipants.flatMap((p) =>
    p.includes(",") ? p.split(",").map((s) => s.trim()).filter(Boolean) : [p],
  );
  return [...new Set(split.map((p) => p.toLowerCase().trim()))];
}

/**
 * Classify a single participant against known people + internal domains.
 */
function classifySingle(normalized: string, knownPeople: KnownPerson[]): ParticipantInfo {
  const match = knownPeople.find(
    (p) => p.email && p.email.toLowerCase() === normalized,
  ) ?? knownPeople.find(
    (p) => p.name.toLowerCase() === normalized,
  );

  if (match) {
    if (match.team) {
      return { raw: normalized, label: "internal", matchedName: match.name };
    }
    return {
      raw: normalized,
      label: "external",
      matchedName: match.name,
      organizationName: match.organization_name,
      organizationType: match.organization_type,
    };
  }

  // Fallback: check if email domain is internal
  const domain = normalized.includes("@") ? normalized.split("@")[1] : null;
  if (domain && INTERNAL_DOMAINS.includes(domain)) {
    return { raw: normalized, label: "internal" };
  }

  return { raw: normalized, label: "unknown" };
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
 * Determine party_type deterministically from classified participants.
 * - All internal → "internal"
 * - Known external with org type → use org type (client/partner)
 * - Unknown externals, no org → "other"
 */
export function determinePartyType(participants: ParticipantInfo[]): PartyType {
  if (participants.length === 0) return "other";
  if (participants.every((p) => p.label === "internal")) return "internal";

  const knownExternal = participants.find(
    (p) => p.label === "external" && p.organizationType,
  );
  if (knownExternal?.organizationType === "client") return "client";
  if (knownExternal?.organizationType === "partner") return "partner";

  return "other";
}

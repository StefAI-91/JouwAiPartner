import type { KnownPerson } from "@repo/database/queries/people";

export interface SpeakerInfo {
  /** Original speaker name from Fireflies transcript */
  raw: string;
  /** Resolved display name (matched person name or raw) */
  name: string;
  /** Person ID if matched to people table */
  personId: string | null;
  /** Classification label */
  label: "internal" | "external" | "unknown";
  /** Organization name if known */
  organizationName: string | null;
  /** Role from people table */
  role: string | null;
}

export type SpeakerMap = Map<string, SpeakerInfo>;

/**
 * Extract unique speaker names from Fireflies sentences.
 */
export function extractSpeakerNames(sentences: { speaker_name: string }[]): string[] {
  return [...new Set(sentences.map((s) => s.speaker_name))];
}

/**
 * Parse displayName format like "Bas | Markant Internet" into
 * { firstName: "Bas", orgHint: "Markant Internet" }.
 * Returns null if the name doesn't match this pattern.
 */
function parseDisplayName(name: string): { firstName: string; orgHint: string } | null {
  const parts = name.split("|").map((p) => p.trim());
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { firstName: parts[0], orgHint: parts[1] };
}

/**
 * Try to match a speaker name against known people.
 *
 * Matching strategy (in order):
 * 1. Exact name match (case-insensitive)
 * 2. DisplayName format ("Bas | Markant Internet") → match firstName + org
 */
function matchSpeaker(speakerName: string, knownPeople: KnownPerson[]): KnownPerson | null {
  const lower = speakerName.toLowerCase().trim();

  // Strategy 1: exact name match
  const exactMatch = knownPeople.find((p) => p.name.toLowerCase() === lower);
  if (exactMatch) return exactMatch;

  // Strategy 2: displayName format "FirstName | OrgName"
  const parsed = parseDisplayName(speakerName);
  if (parsed) {
    const firstNameLower = parsed.firstName.toLowerCase();
    const orgHintLower = parsed.orgHint.toLowerCase();

    const match = knownPeople.find((p) => {
      const personFirstName = p.name.split(" ")[0]?.toLowerCase();
      const personOrg = p.organization_name?.toLowerCase();
      return personFirstName === firstNameLower && personOrg?.includes(orgHintLower);
    });
    if (match) return match;

    // Fallback: just match on first name within people who have an org containing the hint
    const orgMatch = knownPeople.find((p) => {
      const personFirstName = p.name.split(" ")[0]?.toLowerCase();
      return (
        personFirstName === firstNameLower &&
        p.organization_name?.toLowerCase().includes(orgHintLower)
      );
    });
    if (orgMatch) return orgMatch;
  }

  return null;
}

/**
 * Build a speaker map from Fireflies sentence speaker names,
 * matched against the known people database.
 *
 * Unmatched speakers are included with personId: null and label: "unknown".
 */
export function buildSpeakerMap(speakerNames: string[], knownPeople: KnownPerson[]): SpeakerMap {
  const map: SpeakerMap = new Map();

  for (const speakerName of speakerNames) {
    if (map.has(speakerName)) continue;

    const match = matchSpeaker(speakerName, knownPeople);

    if (match) {
      const label = match.team ? "internal" : "external";
      map.set(speakerName, {
        raw: speakerName,
        name: match.name,
        personId: match.id,
        label,
        organizationName: match.organization_name,
        role: match.role,
      });
    } else {
      map.set(speakerName, {
        raw: speakerName,
        name: speakerName,
        personId: null,
        label: "unknown",
        organizationName: null,
        role: null,
      });
    }
  }

  return map;
}

/**
 * Format speaker map as context string for AI agents.
 * Example output:
 *   - Wouter van den Heuvel (INTERN, JAIP)
 *   - Bas Spenkelink (EXTERN, Markant Internet)
 *   - info (ONBEKEND)
 */
export function formatSpeakerContext(speakerMap: SpeakerMap): string {
  const lines: string[] = [];

  for (const info of speakerMap.values()) {
    const details: string[] = [];

    if (info.label === "internal") {
      details.push("INTERN");
    } else if (info.label === "external") {
      details.push("EXTERN");
      if (info.organizationName) details.push(info.organizationName);
    } else {
      details.push("ONBEKEND");
    }

    if (info.role) details.push(`rol: ${info.role}`);

    lines.push(`- ${info.name} (${details.join(", ")})`);
  }

  return lines.join("\n");
}

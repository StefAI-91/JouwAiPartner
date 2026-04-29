import type { IdentifiedProject } from "../../validations/gatekeeper";
import { normalize, type KnownProject, type TaggedItem } from "./types";

/** Confidence threshold: items below this go to "Algemeen" */
export const CONFIDENCE_THRESHOLD = 0.7;

interface MatchResult {
  project_name: string;
  project_id: string | null;
  confidence: number;
}

/**
 * Sentinel used to distinguish "explicitly Algemeen" from "no match".
 */
export type PrefixResolution =
  | { kind: "algemeen" }
  | { kind: "match"; match: MatchResult }
  | { kind: "no-match" };

/**
 * Parse a bracketed prefix from the start of a text item.
 *
 * Accepts:  "[ProjectName] rest of text" -> { name: "ProjectName", rest: "rest of text" }
 * Rejects:  missing bracket, nested [[...]], empty [], whitespace-only [   ], unclosed.
 *
 * Regex intent: one pair of brackets at the very start, inside: one or more chars
 * that are NOT `[` or `]` (so nested brackets fail). Name is trimmed and must be non-empty.
 */
export function parsePrefix(text: string): { name: string; rest: string } | null {
  const match = text.match(/^\[([^\[\]]+)\]\s+([\s\S]+)$/);
  if (!match) return null;
  const name = match[1].trim();
  if (name.length === 0) return null;
  return { name, rest: match[2] };
}

/**
 * Resolve a parsed prefix name against Gatekeeper-identified projects and knownProjects.
 *
 * Order:
 *   1. "algemeen" (case-insensitive) -> explicit Algemeen (null project)
 *   2. Exact match against Gatekeeper-identified projects -> confidence 1.0
 *   3. Exact match against knownProjects name or alias -> confidence 0.95
 *   4. Otherwise -> no-match (item falls through to rule-based fallback or Algemeen)
 */
export function resolvePrefixProject(
  name: string,
  identifiedProjects: IdentifiedProject[],
  knownProjects: KnownProject[],
  ignoredNames?: Set<string>,
): PrefixResolution {
  const normalizedName = normalize(name);

  if (normalizedName === "algemeen") {
    return { kind: "algemeen" };
  }

  // Skip if explicitly ignored
  if (ignoredNames?.has(normalizedName)) {
    return { kind: "no-match" };
  }

  // Gatekeeper-identified match (confidence 1.0)
  for (const p of identifiedProjects) {
    if (normalize(p.project_name) === normalizedName) {
      return {
        kind: "match",
        match: { project_name: p.project_name, project_id: p.project_id, confidence: 1.0 },
      };
    }
  }

  // knownProjects name or alias match (confidence 0.95)
  for (const p of knownProjects) {
    if (normalize(p.name) === normalizedName) {
      return {
        kind: "match",
        match: { project_name: p.name, project_id: p.id, confidence: 0.95 },
      };
    }
    for (const alias of p.aliases) {
      if (normalize(alias) === normalizedName) {
        return {
          kind: "match",
          match: { project_name: p.name, project_id: p.id, confidence: 0.95 },
        };
      }
    }
  }

  return { kind: "no-match" };
}

/**
 * Try to match a text item against a list of project candidates.
 * Returns the best match (highest confidence) or null.
 */
function matchItemAgainstProjects(
  normalizedItem: string,
  candidates: { name: string; id: string | null; aliases?: string[] }[],
  ignoredNames?: Set<string>,
): MatchResult | null {
  let bestMatch: MatchResult | null = null;

  for (const candidate of candidates) {
    const normalizedName = normalize(candidate.name);

    // Skip ignored names
    if (ignoredNames?.has(normalizedName)) continue;

    // Strategy 1: Exact match on name — project name appears in item
    if (normalizedName.length >= 3 && normalizedItem.includes(normalizedName)) {
      const confidence = 1.0;
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { project_name: candidate.name, project_id: candidate.id, confidence };
      }
      continue;
    }

    // Strategy 1b: Exact match on alias (confidence 0.9)
    if (candidate.aliases) {
      for (const alias of candidate.aliases) {
        const normalizedAlias = normalize(alias);
        if (ignoredNames?.has(normalizedAlias)) continue;
        if (normalizedAlias.length >= 3 && normalizedItem.includes(normalizedAlias)) {
          const confidence = 0.9;
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { project_name: candidate.name, project_id: candidate.id, confidence };
          }
          break;
        }
      }
      if (bestMatch?.confidence === 0.9) continue;
    }

    // Strategy 2: Keyword overlap for multi-word names
    const nameWords = normalizedName.split(" ").filter((w) => w.length > 2);
    if (nameWords.length >= 2) {
      const matchCount = nameWords.filter((word) => normalizedItem.includes(word)).length;
      const ratio = matchCount / nameWords.length;

      if (ratio >= 1.0) {
        const confidence = 0.8;
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { project_name: candidate.name, project_id: candidate.id, confidence };
        }
      } else if (ratio >= 2 / 3 && matchCount >= 2) {
        const confidence = 0.6;
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { project_name: candidate.name, project_id: candidate.id, confidence };
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Apply rule-based matching as a fallback (used when no prefix is present).
 */
export function ruleBasedMatch(
  content: string,
  identifiedProjects: IdentifiedProject[],
  knownProjects: KnownProject[],
  ignoredNames?: Set<string>,
): TaggedItem {
  const normalizedItem = normalize(content);

  const gatekeeperCandidates = identifiedProjects.map((p) => ({
    name: p.project_name,
    id: p.project_id,
  }));
  const dbCandidates = knownProjects.map((p) => ({
    name: p.name,
    id: p.id,
    aliases: p.aliases,
  }));

  // First: Gatekeeper-identified (priority)
  let match = matchItemAgainstProjects(normalizedItem, gatekeeperCandidates, ignoredNames);

  // Fallback: knownProjects from DB
  if (!match || match.confidence < CONFIDENCE_THRESHOLD) {
    const dbMatch = matchItemAgainstProjects(normalizedItem, dbCandidates, ignoredNames);
    if (dbMatch && dbMatch.confidence >= CONFIDENCE_THRESHOLD) {
      dbMatch.confidence = Math.min(dbMatch.confidence, 0.9);
      match = dbMatch;
    }
  }

  if (match && match.confidence >= CONFIDENCE_THRESHOLD) {
    return {
      content,
      project_name: match.project_name,
      project_id: match.project_id,
      confidence: match.confidence,
    };
  }
  return { content, project_name: null, project_id: null, confidence: 0 };
}

import type { IdentifiedProject } from "../validations/gatekeeper";

export interface TaggedItem {
  content: string;
  project_name: string | null;
  project_id: string | null;
  confidence: number;
}

export interface KnownProject {
  id: string;
  name: string;
  aliases: string[];
}

export interface TaggerInput {
  kernpunten: string[];
  vervolgstappen: string[];
  identified_projects: IdentifiedProject[];
  /** Known projects from DB — used as fallback when Gatekeeper misses a project */
  knownProjects?: KnownProject[];
  /** Lowercased names to skip during matching (from ignored_entities) */
  ignoredNames?: Set<string>;
}

export interface TaggerOutput {
  kernpunten: TaggedItem[];
  vervolgstappen: TaggedItem[];
}

/** Confidence threshold: items below this go to "Algemeen" */
const CONFIDENCE_THRESHOLD = 0.7;

interface MatchResult {
  project_name: string;
  project_id: string | null;
  confidence: number;
}

/**
 * Normalize text for matching: lowercase, trim, collapse whitespace.
 */
function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
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
 * Tag a list of items against identified projects + known DB projects as fallback.
 */
function tagItems(
  items: string[],
  identifiedProjects: IdentifiedProject[],
  knownProjects: KnownProject[],
  ignoredNames?: Set<string>,
): TaggedItem[] {
  // Build candidate lists
  const gatekeeperCandidates = identifiedProjects.map((p) => ({
    name: p.project_name,
    id: p.project_id,
  }));

  const dbCandidates = knownProjects.map((p) => ({
    name: p.name,
    id: p.id,
    aliases: p.aliases,
  }));

  // Filter out theme headers (### ...) from summarizer — they're structural, not content
  const contentItems = items.filter((item) => !item.startsWith("### "));

  return contentItems.map((content) => {
    const normalizedItem = normalize(content);

    // First: match against Gatekeeper-identified projects (priority)
    let match = matchItemAgainstProjects(normalizedItem, gatekeeperCandidates, ignoredNames);

    // Fallback: match against known DB projects (catches what Gatekeeper missed)
    if (!match || match.confidence < CONFIDENCE_THRESHOLD) {
      const dbMatch = matchItemAgainstProjects(normalizedItem, dbCandidates, ignoredNames);
      if (dbMatch && dbMatch.confidence >= CONFIDENCE_THRESHOLD) {
        // DB fallback gets slightly lower confidence than Gatekeeper match
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
    // No match or below threshold -> "Algemeen"
    return { content, project_name: null, project_id: null, confidence: 0 };
  });
}

/**
 * Rule-based Tagger: matches kernpunten and vervolgstappen to identified projects.
 * Deterministic, no LLM call, runs in <50ms.
 *
 * Matching priority:
 * 1. Gatekeeper-identified projects (highest priority)
 * 2. Known DB projects by name/alias (fallback)
 *
 * - If identified_projects is empty AND no knownProjects, all items go to "Algemeen" (RULE-016).
 * - Items with confidence < 0.7 go to "Algemeen" (AI-036).
 * - On error, returns all items as "Algemeen" (RULE-015).
 */
export function runTagger(input: TaggerInput): TaggerOutput {
  const knownProjects = input.knownProjects ?? [];

  // RULE-016: No projects at all -> skip tagging, everything to "Algemeen"
  if (input.identified_projects.length === 0 && knownProjects.length === 0) {
    return {
      kernpunten: input.kernpunten.map((content) => ({
        content,
        project_name: null,
        project_id: null,
        confidence: 0,
      })),
      vervolgstappen: input.vervolgstappen.map((content) => ({
        content,
        project_name: null,
        project_id: null,
        confidence: 0,
      })),
    };
  }

  return {
    kernpunten: tagItems(
      input.kernpunten,
      input.identified_projects,
      knownProjects,
      input.ignoredNames,
    ),
    vervolgstappen: tagItems(
      input.vervolgstappen,
      input.identified_projects,
      knownProjects,
      input.ignoredNames,
    ),
  };
}

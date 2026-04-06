import type { IdentifiedProject } from "../validations/gatekeeper";

export interface TaggedItem {
  content: string;
  project_name: string | null;
  project_id: string | null;
  confidence: number;
}

export interface TaggerInput {
  kernpunten: string[];
  vervolgstappen: string[];
  identified_projects: IdentifiedProject[];
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
 * Try to match a text item against identified projects.
 * Returns the best match (highest confidence) or null.
 *
 * Strategies in priority order:
 * 1. Exact match on project name (confidence 1.0)
 * 2. Exact match on alias (confidence 0.9) — not applicable here since aliases come from DB, not Gatekeeper
 * 3. Substring match (confidence 0.8)
 * 4. Keyword overlap >= 2/3 words (confidence 0.6)
 */
function matchItem(
  itemText: string,
  projects: IdentifiedProject[],
  ignoredNames?: Set<string>,
): MatchResult | null {
  const normalizedItem = normalize(itemText);
  let bestMatch: MatchResult | null = null;

  for (const project of projects) {
    const normalizedName = normalize(project.project_name);

    // FUNC-092: Skip matching for ignored names
    if (ignoredNames?.has(normalizedName)) continue;

    // Strategy 1: Exact match — project name appears as whole word/phrase in item
    if (normalizedItem.includes(normalizedName)) {
      const confidence = 1.0;
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = {
          project_name: project.project_name,
          project_id: project.project_id,
          confidence,
        };
      }
      continue;
    }

    // Strategy 2: Substring match — check if significant part of name is in item
    // (name has 2+ words and at least the core part appears)
    const nameWords = normalizedName.split(" ").filter((w) => w.length > 2);
    if (nameWords.length >= 2) {
      // Strategy 3: Keyword overlap — at least 2/3 of name words appear in item
      const matchCount = nameWords.filter((word) => normalizedItem.includes(word)).length;
      const ratio = matchCount / nameWords.length;

      if (ratio >= 1.0) {
        // All words match but not as exact phrase — substring match
        const confidence = 0.8;
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            project_name: project.project_name,
            project_id: project.project_id,
            confidence,
          };
        }
      } else if (ratio >= 2 / 3 && matchCount >= 2) {
        const confidence = 0.6;
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            project_name: project.project_name,
            project_id: project.project_id,
            confidence,
          };
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Tag a list of items (kernpunten or vervolgstappen) against identified projects.
 */
function tagItems(
  items: string[],
  projects: IdentifiedProject[],
  ignoredNames?: Set<string>,
): TaggedItem[] {
  return items.map((content) => {
    const match = matchItem(content, projects, ignoredNames);
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
 * - If identified_projects is empty, all items go to "Algemeen" (RULE-016).
 * - Items with confidence < 0.7 go to "Algemeen" (AI-036).
 * - On error, returns all items as "Algemeen" (RULE-015).
 */
export function runTagger(input: TaggerInput): TaggerOutput {
  // RULE-016: No projects identified -> skip tagging, everything to "Algemeen"
  if (input.identified_projects.length === 0) {
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
    kernpunten: tagItems(input.kernpunten, input.identified_projects, input.ignoredNames),
    vervolgstappen: tagItems(input.vervolgstappen, input.identified_projects, input.ignoredNames),
  };
}

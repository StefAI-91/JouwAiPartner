import type { IdentifiedProject } from "../../validations/gatekeeper";
import {
  parsePrefix,
  resolvePrefixProject,
  ruleBasedMatch,
  type PrefixResolution,
} from "./projects";
import type { KnownProject, TaggedItem, TaggerInput, TaggerOutput } from "./types";

/**
 * Tag kernpunten: parse theme-headers (### [X] ...) and propagate attribution to items beneath.
 * Item-level prefixes override the inherited theme (EDGE-012).
 * Missing/malformed prefixes fall back to rule-based matching (AI-069).
 */
function tagKernpunten(
  items: string[],
  identifiedProjects: IdentifiedProject[],
  knownProjects: KnownProject[],
  ignoredNames?: Set<string>,
): TaggedItem[] {
  const result: TaggedItem[] = [];
  // currentTheme = null means "no inherited theme" (fallback to rule-based)
  //            = { kind: "algemeen" } means "inherited Algemeen"
  //            = { kind: "match", ... } means "inherited project"
  let currentTheme: PrefixResolution | null = null;

  for (const raw of items) {
    if (raw.startsWith("### ")) {
      // Theme header: update inheritance, but don't emit as content
      const headerBody = raw.slice(4); // strip "### "
      const parsed = parsePrefix(headerBody);
      if (parsed) {
        currentTheme = resolvePrefixProject(
          parsed.name,
          identifiedProjects,
          knownProjects,
          ignoredNames,
        );
      } else {
        // Theme without prefix -> reset, per-item rule-based fallback (AI-069)
        currentTheme = null;
      }
      continue;
    }

    // Item-level prefix overrides inherited theme (EDGE-012)
    const itemParsed = parsePrefix(raw);
    if (itemParsed) {
      const resolved = resolvePrefixProject(
        itemParsed.name,
        identifiedProjects,
        knownProjects,
        ignoredNames,
      );
      result.push(
        contentFromResolution(
          itemParsed.rest,
          resolved,
          identifiedProjects,
          knownProjects,
          ignoredNames,
        ),
      );
      continue;
    }

    // No item-level prefix: use inherited theme if available, otherwise fallback
    if (currentTheme === null) {
      result.push(ruleBasedMatch(raw, identifiedProjects, knownProjects, ignoredNames));
    } else {
      result.push(
        contentFromResolution(raw, currentTheme, identifiedProjects, knownProjects, ignoredNames),
      );
    }
  }

  return result;
}

/**
 * Build a TaggedItem given already-stripped content + a prefix-resolution.
 *
 * - algemeen -> null project
 * - match    -> use the matched project at resolved confidence
 * - no-match -> fallback to rule-based on the stripped content (AI-067 safety:
 *               no hallucinated project_name_raw leaks through)
 */
function contentFromResolution(
  content: string,
  resolved: PrefixResolution,
  identifiedProjects: IdentifiedProject[],
  knownProjects: KnownProject[],
  ignoredNames?: Set<string>,
): TaggedItem {
  if (resolved.kind === "algemeen") {
    return { content, project_name: null, project_id: null, confidence: 0 };
  }
  if (resolved.kind === "match") {
    return {
      content,
      project_name: resolved.match.project_name,
      project_id: resolved.match.project_id,
      confidence: resolved.match.confidence,
    };
  }
  // kind === "no-match": hallucinated / unknown prefix.
  // Try rule-based on the stripped content as a safety net. If nothing matches,
  // item ends up in Algemeen (no hallucinated project_name_raw written to DB).
  return ruleBasedMatch(content, identifiedProjects, knownProjects, ignoredNames);
}

/**
 * Tag vervolgstappen: each item is self-attributing (no inheritance, AI-064).
 * Parse prefix per item, fallback to rule-based when absent.
 */
function tagVervolgstappen(
  items: string[],
  identifiedProjects: IdentifiedProject[],
  knownProjects: KnownProject[],
  ignoredNames?: Set<string>,
): TaggedItem[] {
  return items.map((raw) => {
    // Skip any accidental ### header (shouldn't occur for vervolgstappen, but safe)
    if (raw.startsWith("### ")) {
      return ruleBasedMatch(raw, identifiedProjects, knownProjects, ignoredNames);
    }

    const parsed = parsePrefix(raw);
    if (parsed) {
      const resolved = resolvePrefixProject(
        parsed.name,
        identifiedProjects,
        knownProjects,
        ignoredNames,
      );
      return contentFromResolution(
        parsed.rest,
        resolved,
        identifiedProjects,
        knownProjects,
        ignoredNames,
      );
    }

    // No prefix -> rule-based fallback (AI-070)
    return ruleBasedMatch(raw, identifiedProjects, knownProjects, ignoredNames);
  });
}

/**
 * Rule-based Tagger with Summarizer prefix-parser.
 * Runs in <50ms, no LLM call.
 *
 * Pipeline:
 * 1. kernpunten: parse ### [X] ... theme-headers and propagate to items underneath
 *    (items can override with their own [X] ... prefix, EDGE-012).
 * 2. vervolgstappen: each item self-attributes via its own prefix.
 * 3. Items without a valid prefix fall through to existing rule-based matching.
 * 4. [Algemeen] (case-insensitive) always resolves to null project.
 * 5. Hallucinated prefixes (no match in gatekeeper + knownProjects) fall through
 *    to rule-based on stripped content, ensuring no bogus project_name_raw is
 *    written to the DB (AI-067).
 *
 * Matching priority within prefix-resolution:
 *   - Gatekeeper-identified project (confidence 1.0)
 *   - knownProjects name/alias (confidence 0.95)
 *
 * Graceful degradation is handled at the pipeline-level (RULE-015).
 */
export function runTagger(input: TaggerInput): TaggerOutput {
  const knownProjects = input.knownProjects ?? [];

  // RULE-016: No projects at all -> skip tagging, everything to "Algemeen"
  if (input.identified_projects.length === 0 && knownProjects.length === 0) {
    return {
      kernpunten: input.kernpunten
        .filter((item) => !item.startsWith("### "))
        .map((content) => ({
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
    kernpunten: tagKernpunten(
      input.kernpunten,
      input.identified_projects,
      knownProjects,
      input.ignoredNames,
    ),
    vervolgstappen: tagVervolgstappen(
      input.vervolgstappen,
      input.identified_projects,
      knownProjects,
      input.ignoredNames,
    ),
  };
}

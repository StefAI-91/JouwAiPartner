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
 * Sentinel used to distinguish "explicitly Algemeen" from "no match".
 */
type PrefixResolution =
  | { kind: "algemeen" }
  | { kind: "match"; match: MatchResult }
  | { kind: "no-match" };

/**
 * Normalize text for matching: lowercase, trim, collapse whitespace.
 */
function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * TH-011 (FUNC-271) — Parse `[Themes: X, Y]` annotatie(s) uit een tekst.
 * Anders dan `parsePrefix` is deze parser **tolerant** voor positie: de
 * annotatie mag overal in de string staan (niet alleen aan het begin), en
 * meerdere occurrences worden geaccumuleerd. Summarizer schrijft de marker
 * typisch achter de project-prefix; RiskSpecialist zou 'm ergens in de
 * content kunnen zetten.
 *
 * Matched patroon: `[Themes: Name1, Name2]` — comma-separated, trim per naam,
 * lege namen worden weggefilterd. Case-insensitive matcht alleen op `Themes:`
 * (om botsingen met `[ProjectName]` of `[Algemeen]` te voorkomen).
 *
 * Returnt een array van namen in volgorde van verschijnen; duplicates
 * blijven staan (caller dedupliceert op UUID na resolve).
 */
export function parseThemesAnnotation(text: string): string[] {
  const matches = text.matchAll(/\[\s*Themes\s*:\s*([^\[\]]+)\]/gi);
  const names: string[] = [];
  for (const match of matches) {
    const rawList = match[1];
    for (const raw of rawList.split(",")) {
      const name = raw.trim();
      if (name.length > 0) names.push(name);
    }
  }
  return names;
}

export interface ThemeRef {
  themeId: string;
  name: string;
}

/**
 * TH-011 (FUNC-271) — Resolve parsed theme-namen naar theme_id's. Spiegelt
 * `resolvePrefixProject`: eerst de Detector-identified_themes (die werden
 * voor deze meeting specifiek bevestigd), daarna de volle verified-themes
 * catalogus als DB-fallback.
 *
 * Case-insensitive match op name. Onbekende namen → leeg in de output
 * (caller logt eventueel). Duplicates in de input (bv. twee annotaties die
 * hetzelfde thema noemen) worden gededupliceerd op themeId.
 */
export function resolveThemeRefs(
  names: string[],
  identifiedThemes: ThemeRef[],
  knownThemes: ThemeRef[],
): ThemeRef[] {
  const seen = new Set<string>();
  const result: ThemeRef[] = [];

  for (const raw of names) {
    const normalized = normalize(raw);
    if (normalized.length === 0) continue;

    let hit =
      identifiedThemes.find((t) => normalize(t.name) === normalized) ??
      knownThemes.find((t) => normalize(t.name) === normalized) ??
      null;

    if (!hit) continue;
    if (seen.has(hit.themeId)) continue;
    seen.add(hit.themeId);
    result.push({ themeId: hit.themeId, name: hit.name });
  }

  return result;
}

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
function ruleBasedMatch(
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

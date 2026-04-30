/**
 * Shared types + helpers voor de Tagger-pipeline. Dit is de basis-laag:
 * `themes.ts`, `projects.ts` en `tag.ts` importeren uitsluitend hieruit
 * (en bij `tag.ts` ook uit themes/projects). Houdt deze module vrij van
 * domein-logica om cycles te voorkomen.
 */

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

export interface ThemeRef {
  themeId: string;
  name: string;
}

export interface TaggerInput {
  kernpunten: string[];
  vervolgstappen: string[];
  identified_projects: import("../../validations/gatekeeper").IdentifiedProject[];
  /** Known projects from DB — used as fallback when Gatekeeper misses a project */
  knownProjects?: KnownProject[];
  /** Lowercased names to skip during matching (from ignored_entities) */
  ignoredNames?: Set<string>;
}

export interface TaggerOutput {
  kernpunten: TaggedItem[];
  vervolgstappen: TaggedItem[];
}

/**
 * Normalize text for matching: lowercase, trim, collapse whitespace.
 */
export function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

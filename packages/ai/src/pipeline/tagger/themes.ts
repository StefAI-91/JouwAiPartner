import { normalize, type ThemeRef } from "./types";

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

    const hit =
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

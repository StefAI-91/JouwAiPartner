import type { ThemeRef } from "../../tagger";

export function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * FUNC-271 (3) — fallback wanneer extraction geen `[Themes:]` annotatie
 * heeft. Zoek substrings van theme-namen (≥3 chars) in content. Bij 2+
 * matches → ambiguous → geen fallback (caller kiest geen). Dit is een
 * goedkope, deterministische safety net; ML/embedding-based matching
 * blijft out of scope (zie TH-011 sprint §Out of scope).
 */
export function substringFallbackNames(content: string, knownRefs: ThemeRef[]): string[] {
  const normalizedContent = normalizeName(content);
  const hits = knownRefs.filter((t) => {
    const n = normalizeName(t.name);
    return n.length >= 3 && normalizedContent.includes(n);
  });
  if (hits.length !== 1) return [];
  return [hits[0].name];
}

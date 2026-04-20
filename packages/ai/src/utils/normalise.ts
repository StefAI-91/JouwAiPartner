/**
 * Normalisatie-helpers gedeeld door alle agents die structured-output
 * van Anthropic terugkrijgen.
 *
 * Twee bestaansredenen:
 *
 * 1. Anthropic's structured-output werkt beter met "alle velden REQUIRED"
 *    schemas dan met optional. Daarom gebruiken we sentinel-strings ("",
 *    "n/a") in de raw schema. Downstream (DB, UI) wil null. `emptyToNull`
 *    en `sentinelToNull` doen die conversie consistent.
 *
 * 2. Quote-verificatie: het model paraphraseert vaak punctuatie zonder
 *    inhoudelijke afwijking (smart-quotes, dashes, whitespace). De agents
 *    gebruiken `normaliseForQuoteMatch` om quote-aanwezigheid in transcript
 *    te controleren zonder false negatives op kosmetische verschillen.
 *
 * Voor PW-QC-03: deze 3 functies stonden eerder byte-identiek in zowel
 * meeting-structurer.ts als risk-specialist.ts. Iedere bugfix moest op
 * 2 plekken — single responsibility verbroken.
 */

/**
 * Lossy normalisatie van transcript en quote zodat een paraphrased
 * source_quote nog steeds matcht. Gebruikt door post-processing in beide
 * agents om confidence te cappen wanneer een quote aantoonbaar niet in
 * het transcript staat.
 */
export function normaliseForQuoteMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'") // smart single quotes → straight
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"') // smart double quotes → straight
    .replace(/[\u2013\u2014\u2212]/g, "-") // en/em dash + minus → hyphen
    .replace(/\u00a0/g, " ") // non-breaking space → regular
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}

/** Map sentinel "" (raw schema) naar null (publiek type). */
export function emptyToNull(s: string): string | null {
  return s === "" ? null : s;
}

/** Map sentinel "n/a" (raw enum) naar null (publiek type). */
export function sentinelToNull<T extends string>(v: T): Exclude<T, "n/a"> | null {
  return v === "n/a" ? null : (v as Exclude<T, "n/a">);
}

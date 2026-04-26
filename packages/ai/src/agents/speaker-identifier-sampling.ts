/**
 * Sampling-helpers voor speaker-identifier.
 *
 * Het ElevenLabs-transcript is plain text in de vorm:
 *   [speaker_0]: utterance text
 *   [speaker_1]: utterance text
 *   ...
 *
 * Voor de speaker-identifier hoeven we niet het hele transcript naar Haiku
 * te sturen — een handvol representatieve utterances per speaker volstaat.
 */

export interface SpeakerUtterance {
  speaker_id: string;
  text: string;
}

const SPEAKER_LINE_RE = /^\[(speaker_\d+|unknown)\]:\s*(.+)$/;

/**
 * Header-blacklist voor regels die toevallig op een naam lijken maar dat
 * niet zijn (notities, headers in gestructureerde transcripts).
 */
const FIREFLIES_NAME_BLACKLIST = new Set([
  "Note",
  "Notes",
  "Action",
  "Decision",
  "Summary",
  "Q",
  "A",
  "Speaker",
]);

/**
 * Test of een token een geldig "naamwoord" is voor onze splitting-heuristiek.
 * Accepteert: hoofdletter-startend (Stef, Banninga), Nederlandse tussenvoegsels
 * in lowercase (van, de, den, der, von, le, la, du, te, ter), losse initialen
 * (J., A.), apostrof-namen (O'Brien). Weigert woorden met cijfers of leestekens.
 */
const TUSSENVOEGSELS = new Set([
  "van",
  "de",
  "den",
  "der",
  "von",
  "le",
  "la",
  "du",
  "te",
  "ter",
  "el",
  "al",
]);
function isNameToken(token: string): boolean {
  if (!token) return false;
  if (TUSSENVOEGSELS.has(token.toLowerCase())) return true;
  // Initialen als J., A.B.
  if (/^[A-Z](\.[A-Z])*\.?$/.test(token)) return true;
  // Naam-kapitalisatie: hoofdletter + alleen letters, apostrof of streepje
  return /^[A-Z][\p{L}'’-]*$/u.test(token);
}

/**
 * Parse een ElevenLabs-transcript naar een chronologische lijst van utterances.
 * Lege regels worden overgeslagen. Multi-line utterances (volgende regels horen
 * bij dezelfde speaker tot een nieuwe `[speaker_X]:`-prefix verschijnt) worden
 * samengevoegd.
 */
export function parseElevenLabsUtterances(transcript: string): SpeakerUtterance[] {
  const lines = transcript.split(/\r?\n/);
  const utterances: SpeakerUtterance[] = [];
  let current: SpeakerUtterance | null = null;

  for (const line of lines) {
    const match = line.match(SPEAKER_LINE_RE);
    if (match) {
      if (current) utterances.push(current);
      current = { speaker_id: match[1], text: match[2].trim() };
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (current) {
      current.text += " " + trimmed;
    }
    // Lijnen vóór de eerste [speaker_X]:-prefix negeren.
  }
  if (current) utterances.push(current);
  return utterances;
}

export interface NamedUtterance {
  name: string;
  text: string;
}

/**
 * Parse een Fireflies-transcript naar named utterances. Format per regel:
 *   "Stef Banninga: tekst..."
 *   "Wouter van den Heuvel: tekst..."
 *
 * Heuristiek: een regel telt als named-utterance als alles vóór de eerste `:`
 * een geldige naam-string is (1-5 tokens die elk `isNameToken` halen, niet
 * blacklisted). Anders telt de regel als vervolgtekst van de vorige spreker.
 */
export function parseFirefliesUtterances(transcript: string): NamedUtterance[] {
  const lines = transcript.split(/\r?\n/);
  const utterances: NamedUtterance[] = [];
  let current: NamedUtterance | null = null;

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    let matched = false;
    if (colonIdx > 0 && colonIdx < 60) {
      const candidate = line.slice(0, colonIdx).trim();
      const rest = line.slice(colonIdx + 1).trim();
      const tokens = candidate.split(/\s+/);
      if (
        tokens.length >= 1 &&
        tokens.length <= 5 &&
        !FIREFLIES_NAME_BLACKLIST.has(tokens[0]) &&
        tokens.every(isNameToken)
      ) {
        if (current) utterances.push(current);
        current = { name: candidate, text: rest };
        matched = true;
      }
    }
    if (matched) continue;
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (current) {
      current.text += " " + trimmed;
    }
  }
  if (current) utterances.push(current);
  return utterances;
}

/**
 * Pick representatieve utterances per Fireflies-naam. Zelfde strategie als
 * sampleUtterancesPerSpeaker maar gegroepeerd op `name`.
 */
export function sampleUtterancesPerName(
  utterances: NamedUtterance[],
  perName = 6,
  minLength = 40,
): Map<string, string[]> {
  const byName = new Map<string, NamedUtterance[]>();
  for (const u of utterances) {
    const list = byName.get(u.name) ?? [];
    list.push(u);
    byName.set(u.name, list);
  }
  const result = new Map<string, string[]>();
  for (const [name, list] of byName.entries()) {
    const filtered = list.filter((u) => u.text.length >= minLength);
    const pool = filtered.length > 0 ? filtered : list;
    const sorted = [...pool].sort((a, b) => b.text.length - a.text.length);
    result.set(
      name,
      sorted.slice(0, perName).map((u) => u.text),
    );
  }
  return result;
}

/**
 * Pick representatieve utterances per speaker. Strategie:
 *  - Skip uitspraken korter dan `minLength` chars (filler: "Ja", "Oké", "Cool").
 *  - Sorteer overgebleven op lengte aflopend.
 *  - Pak de eerste `perSpeaker` items.
 *
 * Als er geen utterances zijn die boven minLength uitkomen, val terug op de
 * langst beschikbare utterances zonder filter — beter een korte sample dan
 * een speaker compleet missen.
 */
export function sampleUtterancesPerSpeaker(
  utterances: SpeakerUtterance[],
  perSpeaker = 6,
  minLength = 40,
): Map<string, string[]> {
  const bySpeaker = new Map<string, SpeakerUtterance[]>();
  for (const u of utterances) {
    const list = bySpeaker.get(u.speaker_id) ?? [];
    list.push(u);
    bySpeaker.set(u.speaker_id, list);
  }

  const result = new Map<string, string[]>();
  for (const [speaker, list] of bySpeaker.entries()) {
    const filtered = list.filter((u) => u.text.length >= minLength);
    const pool = filtered.length > 0 ? filtered : list;
    const sorted = [...pool].sort((a, b) => b.text.length - a.text.length);
    result.set(
      speaker,
      sorted.slice(0, perSpeaker).map((u) => u.text),
    );
  }
  return result;
}

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

import type React from "react";

/** Structured sentence from Fireflies (stored in raw_fireflies.sentences) */
export interface TranscriptSentence {
  index: number;
  text: string;
  speaker_name: string;
  start_time: number;
  end_time: number;
}

export interface TranscriptLine {
  speaker: string | null;
  text: string;
  timestamp: string | null;
  rawIndex: number;
}

export interface SpeakerBlock {
  speaker: string | null;
  lines: TranscriptLine[];
  timestamp: string | null;
  id: string;
}

/** Convert structured Fireflies sentences to TranscriptLines */
export function sentencesToLines(sentences: TranscriptSentence[]): TranscriptLine[] {
  return sentences.map((s, i) => {
    const minutes = Math.floor(s.start_time / 60);
    const seconds = Math.floor(s.start_time % 60);
    const timestamp = `${minutes}:${String(seconds).padStart(2, "0")}`;

    return {
      speaker: s.speaker_name,
      text: s.text,
      timestamp,
      rawIndex: i,
    };
  });
}

// Parse "Speaker Name:" pattern at the beginning of a line (fallback for old meetings)
const SPEAKER_PATTERN =
  /^([A-Z][a-z\u00C0-\u00FF]+(?:\s+(?:van\s+(?:de[rn]?\s+)?|de\s+)?[A-Z][a-z\u00C0-\u00FF]+)*):\s*/;
// Parse timestamps like (01:20) or (1:04:20)
const TIMESTAMP_PATTERN = /\((\d{1,2}:\d{2}(?::\d{2})?)\)/;

export function parseTranscript(text: string): TranscriptLine[] {
  const rawLines = text.split("\n");
  const lines: TranscriptLine[] = [];
  let currentSpeaker: string | null = null;

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i].trim();
    if (!raw) continue;

    const speakerMatch = raw.match(SPEAKER_PATTERN);
    const timestampMatch = raw.match(TIMESTAMP_PATTERN);

    if (speakerMatch) {
      currentSpeaker = speakerMatch[1];
      const rest = raw.slice(speakerMatch[0].length).trim();
      if (rest) {
        lines.push({
          speaker: currentSpeaker,
          text: rest,
          timestamp: timestampMatch?.[1] ?? null,
          rawIndex: i,
        });
      }
    } else {
      lines.push({
        speaker: currentSpeaker,
        text: raw,
        timestamp: timestampMatch?.[1] ?? null,
        rawIndex: i,
      });
    }
  }

  return lines;
}

/** Group consecutive lines by speaker */
export function groupBySpeaker(lines: TranscriptLine[]): SpeakerBlock[] {
  const blocks: SpeakerBlock[] = [];
  let current: SpeakerBlock | null = null;

  for (const line of lines) {
    if (!current || current.speaker !== line.speaker) {
      current = {
        speaker: line.speaker,
        lines: [line],
        timestamp: line.timestamp,
        id: `block-${line.rawIndex}`,
      };
      blocks.push(current);
    } else {
      current.lines.push(line);
      if (!current.timestamp && line.timestamp) {
        current.timestamp = line.timestamp;
      }
    }
  }

  return blocks;
}

// Assign consistent colors to speakers
const SPEAKER_COLORS = [
  "text-blue-700 dark:text-blue-400",
  "text-emerald-700 dark:text-emerald-400",
  "text-violet-700 dark:text-violet-400",
  "text-amber-700 dark:text-amber-400",
  "text-rose-700 dark:text-rose-400",
  "text-cyan-700 dark:text-cyan-400",
];

export function getSpeakerColor(speaker: string, speakerMap: Map<string, number>): string {
  if (!speakerMap.has(speaker)) {
    speakerMap.set(speaker, speakerMap.size);
  }
  return SPEAKER_COLORS[speakerMap.get(speaker)! % SPEAKER_COLORS.length];
}

export function highlightRefs(
  text: string,
  refs: Set<string>,
  activeRef: string | null,
): React.ReactNode {
  if (refs.size === 0) return text;

  const matches: { start: number; end: number; ref: string }[] = [];
  for (const ref of refs) {
    const idx = text.indexOf(ref);
    if (idx !== -1) {
      matches.push({ start: idx, end: idx + ref.length, ref });
    }
  }

  if (matches.length === 0) return text;
  matches.sort((a, b) => a.start - b.start);

  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if (m.start > lastEnd) {
      parts.push(text.slice(lastEnd, m.start));
    }
    const isActive = activeRef === m.ref;
    parts.push(
      <mark
        key={i}
        data-ref={m.ref}
        className={`rounded px-0.5 transition-colors ${
          isActive ? "bg-yellow-200 ring-2 ring-yellow-400" : "bg-yellow-100/50"
        }`}
      >
        {m.ref}
      </mark>,
    );
    lastEnd = m.end;
  }
  if (lastEnd < text.length) {
    parts.push(text.slice(lastEnd));
  }
  return parts;
}

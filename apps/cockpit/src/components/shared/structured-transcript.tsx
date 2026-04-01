"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";

/** Structured sentence from Fireflies (stored in raw_fireflies.sentences) */
export interface TranscriptSentence {
  index: number;
  text: string;
  speaker_name: string;
  start_time: number;
  end_time: number;
}

interface StructuredTranscriptProps {
  /** Flat transcript string (fallback) */
  transcript: string;
  /** Structured sentences from Fireflies — preferred over transcript parsing */
  sentences?: TranscriptSentence[] | null;
  transcriptRefs: Set<string>;
  activeRef?: string | null;
}

interface TranscriptLine {
  speaker: string | null;
  text: string;
  timestamp: string | null;
  rawIndex: number;
}

/** Convert structured Fireflies sentences to TranscriptLines */
function sentencesToLines(sentences: TranscriptSentence[]): TranscriptLine[] {
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
  /^([A-Z][a-zÀ-ÿ]+(?:\s+(?:van\s+(?:de[rn]?\s+)?|de\s+)?[A-Z][a-zÀ-ÿ]+)*):\s*/;
// Parse timestamps like (01:20) or (1:04:20)
const TIMESTAMP_PATTERN = /\((\d{1,2}:\d{2}(?::\d{2})?)\)/;

function parseTranscript(text: string): TranscriptLine[] {
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

// Group consecutive lines by speaker
interface SpeakerBlock {
  speaker: string | null;
  lines: TranscriptLine[];
  timestamp: string | null;
  id: string;
}

function groupBySpeaker(lines: TranscriptLine[]): SpeakerBlock[] {
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

function getSpeakerColor(speaker: string, speakerMap: Map<string, number>): string {
  if (!speakerMap.has(speaker)) {
    speakerMap.set(speaker, speakerMap.size);
  }
  return SPEAKER_COLORS[speakerMap.get(speaker)! % SPEAKER_COLORS.length];
}

function highlightRefs(text: string, refs: Set<string>, activeRef: string | null): React.ReactNode {
  if (refs.size === 0) return text;

  // Find all ref matches in the text
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

export function StructuredTranscript({
  transcript,
  sentences,
  transcriptRefs,
  activeRef,
}: StructuredTranscriptProps) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { blocks, speakerMap } = useMemo(() => {
    // Prefer structured sentences from Fireflies, fallback to regex parsing
    const lines =
      sentences && sentences.length > 0 ? sentencesToLines(sentences) : parseTranscript(transcript);
    const speakerMap = new Map<string, number>();
    // Pre-assign speaker colors
    for (const line of lines) {
      if (line.speaker) getSpeakerColor(line.speaker, speakerMap);
    }
    return { blocks: groupBySpeaker(lines), speakerMap };
  }, [transcript, sentences]);

  const shouldExpand = expanded || !!activeRef;

  // Scroll to active ref when it changes
  useEffect(() => {
    if (!activeRef || !containerRef.current) return;
    const timer = setTimeout(() => {
      const mark = containerRef.current?.querySelector(`mark[data-ref="${CSS.escape(activeRef)}"]`);
      mark?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => clearTimeout(timer);
  }, [activeRef]);

  // Collect timestamps for jump navigation
  const timestamps = useMemo(
    () => blocks.filter((b) => b.timestamp).map((b) => ({ time: b.timestamp!, id: b.id })),
    [blocks],
  );

  const scrollToBlock = useCallback((id: string) => {
    const el = containerRef.current?.querySelector(`[data-block-id="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Transcript</h3>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              Inklappen <ChevronUp className="size-3.5" />
            </>
          ) : (
            <>
              Uitklappen <ChevronDown className="size-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Timestamp jump navigation */}
      {shouldExpand && timestamps.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {timestamps.slice(0, 20).map(({ time, id }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollToBlock(id)}
              className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
            >
              <Clock className="size-2.5" />
              {time}
            </button>
          ))}
        </div>
      )}

      <div
        ref={containerRef}
        className="relative overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: shouldExpand ? "none" : "0px" }}
      >
        <div className="space-y-3">
          {blocks.map((block) => (
            <div key={block.id} data-block-id={block.id} className="group">
              {block.speaker && (
                <div className="mb-0.5 flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold ${getSpeakerColor(block.speaker, speakerMap)}`}
                  >
                    {block.speaker}
                  </span>
                  {block.timestamp && (
                    <span className="text-[10px] text-muted-foreground/60">{block.timestamp}</span>
                  )}
                </div>
              )}
              <div className="text-sm leading-relaxed text-foreground/80">
                {block.lines.map((line, i) => (
                  <span key={i}>
                    {i > 0 && " "}
                    {highlightRefs(line.text, transcriptRefs, activeRef ?? null)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import {
  sentencesToLines,
  parseTranscript,
  groupBySpeaker,
  getSpeakerColor,
  highlightRefs,
} from "@/lib/transcript";
import type { TranscriptSentence } from "@/lib/transcript";

interface StructuredTranscriptProps {
  /** Flat transcript string (fallback) */
  transcript: string;
  /** Structured sentences from Fireflies — preferred over transcript parsing */
  sentences?: TranscriptSentence[] | null;
  transcriptRefs: Set<string>;
  activeRef?: string | null;
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

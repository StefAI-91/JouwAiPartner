"use client";

import { useState } from "react";
import {
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  CircleAlert,
  Mail,
  Users,
} from "lucide-react";
import { formatDate } from "@repo/ui/format";

interface OrgTimelineEntry {
  date: string;
  source_type: "meeting" | "email";
  title: string;
  summary: string;
  key_decisions: string[];
  open_actions: string[];
}

interface OrgTimelineProps {
  timeline: OrgTimelineEntry[];
}

export function OrgTimeline({ timeline }: OrgTimelineProps) {
  const [expanded, setExpanded] = useState(false);

  if (timeline.length === 0) return null;

  const visibleEntries = expanded ? timeline : timeline.slice(-3);
  const hasMore = timeline.length > 3;

  return (
    <section className="mb-6 rounded-lg bg-[#006B3F]/[0.03] px-5 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-[#006B3F]/60" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
            Relatieverloop
          </h3>
          <span className="text-[10px] text-muted-foreground/55">
            {timeline.length} {timeline.length === 1 ? "touchpoint" : "touchpoints"}
          </span>
        </div>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-[#006B3F]/70 transition-colors hover:text-[#006B3F]"
          >
            {expanded ? (
              <>
                Minder <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Alles tonen <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        )}
      </div>

      <div className="relative ml-2">
        {/* Vertical line */}
        <div className="absolute bottom-2 left-[5px] top-2 w-px bg-[#006B3F]/15" />

        <div className="space-y-4">
          {visibleEntries.map((entry, i) => {
            const SourceIcon = entry.source_type === "email" ? Mail : Users;
            const sourceLabel = entry.source_type === "email" ? "E-mail" : "Meeting";
            return (
              <div key={`${entry.date}-${i}`} className="relative pl-6">
                {/* Dot */}
                <div className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-[#006B3F]/30 bg-white" />

                <div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs font-medium text-foreground/70">
                      {formatDate(entry.date)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#006B3F]/8 px-2 py-0.5 text-[10px] font-medium text-[#006B3F]/70">
                      <SourceIcon className="h-2.5 w-2.5" />
                      {sourceLabel}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-foreground/90">{entry.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-foreground/70">
                    {entry.summary}
                  </p>

                  {/* Key decisions */}
                  {entry.key_decisions.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {entry.key_decisions.map((decision, j) => (
                        <div key={j} className="flex items-start gap-1.5">
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[#006B3F]/50" />
                          <span className="text-xs text-foreground/65">{decision}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Open actions */}
                  {entry.open_actions.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {entry.open_actions.map((action, j) => (
                        <div key={j} className="flex items-start gap-1.5">
                          <CircleAlert className="mt-0.5 h-3 w-3 shrink-0 text-amber-500/60" />
                          <span className="text-xs text-foreground/65">{action}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

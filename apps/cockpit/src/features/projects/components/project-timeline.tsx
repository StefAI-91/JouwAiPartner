"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { formatDateShort } from "@repo/ui/format";
import type { TimelineEntry } from "@repo/ai/validations/project-summary";
import { groupTimelineByMonth } from "../utils/group-timeline-by-month";
import { useActiveMonthObserver } from "../hooks/use-active-month-observer";
import { TimelineMonthSection } from "./timeline-month-section";
import { TimelineSpine } from "./timeline-spine";

interface ProjectTimelineProps {
  timeline: TimelineEntry[];
  startDate: string | null;
  deadline: string | null;
}

const SHORT_MONTH_NL = [
  "Jan",
  "Feb",
  "Mrt",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dec",
];

function shortMonthLabel(monthKey: string): string {
  const parts = monthKey.split("-");
  const idx = Number(parts[1]) - 1;
  if (idx < 0 || idx > 11) return monthKey;
  return SHORT_MONTH_NL[idx];
}

export function ProjectTimeline({ timeline, startDate, deadline }: ProjectTimelineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollPercent, setScrollPercent] = useState(0);

  const groups = useMemo(() => groupTimelineByMonth(timeline), [timeline]);
  const initialMonth = groups[0]?.month ?? null;

  const activeMonth = useActiveMonthObserver(containerRef, "[data-entry]", initialMonth);

  const spineMonths = useMemo(
    () => groups.map((g) => ({ key: g.month, shortLabel: shortMonthLabel(g.month) })),
    [groups],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const total = el.scrollHeight - el.clientHeight;
      const pct = total > 0 ? Math.min(100, Math.max(0, (el.scrollTop / total) * 100)) : 0;
      setScrollPercent(pct);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    return () => el.removeEventListener("scroll", update);
  }, []);

  if (timeline.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#006B3F]" />
          <h2 className="text-sm font-semibold text-foreground">Projectverloop</h2>
        </div>
        <div className="px-6 py-10 text-center">
          <p className="text-sm italic text-muted-foreground">
            Nog geen geverifieerde meetings — verifieer een meeting om het projectverloop te zien.
          </p>
        </div>
      </section>
    );
  }

  const activeLabel = groups.find((g) => g.month === activeMonth)?.label ?? groups[0]?.label ?? "";

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 px-6 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#006B3F]" />
          <h2 className="text-sm font-semibold text-foreground">Projectverloop</h2>
          <span className="text-xs text-muted-foreground">
            · {timeline.length} {timeline.length === 1 ? "touchpoint" : "touchpoints"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Kijkt nu naar:</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#006B3F]/[0.08] px-2 py-0.5 font-medium text-[#006B3F]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#006B3F] animate-pulse" />
            {activeLabel}
          </span>
        </div>
      </div>

      <div className="relative">
        <div
          className="pointer-events-none absolute top-0 left-0 right-2 h-6 z-10"
          style={{
            background: "linear-gradient(180deg, rgba(250,250,249,1) 0%, rgba(250,250,249,0) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-2 h-8 z-10"
          style={{
            background: "linear-gradient(0deg, rgba(250,250,249,1) 0%, rgba(250,250,249,0) 100%)",
          }}
        />

        <div
          ref={containerRef}
          className="overflow-y-auto scroll-smooth"
          style={{ height: "640px", background: "#fafaf9" }}
        >
          <div className="grid grid-cols-[120px_1fr] gap-5 px-6 py-5">
            <TimelineSpine
              months={spineMonths}
              activeMonth={activeMonth}
              scrollPercent={scrollPercent}
              kickoffLabel={startDate ? formatDateShort(startDate) : "—"}
              deadlineLabel={deadline ? formatDateShort(deadline) : "—"}
            />
            <div className="space-y-8 pb-4 min-w-0">
              {groups.map((group) => (
                <TimelineMonthSection key={group.month} group={group} />
              ))}
              <div className="text-center py-2 text-[11px] text-muted-foreground/70">
                <p>— Einde verloop —</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Building2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateShort } from "@/lib/format";
import type { BriefingMeeting, ExtractionCounts } from "@repo/database/queries/dashboard";

interface MeetingCarouselProps {
  meetings: BriefingMeeting[];
  extractionCounts: Record<string, ExtractionCounts>;
  dayLabel: string;
}

const EXTRACTION_LABELS: Record<keyof ExtractionCounts, { label: string; className: string }> = {
  decision: { label: "besluiten", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  action_item: {
    label: "acties",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  need: { label: "behoeften", className: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
  insight: { label: "inzichten", className: "bg-gray-500/15 text-gray-700 dark:text-gray-300" },
};

export function MeetingCarousel({ meetings, extractionCounts, dayLabel }: MeetingCarouselProps) {
  const [current, setCurrent] = useState(0);
  const total = meetings.length;

  const goTo = useCallback(
    (index: number) => setCurrent(((index % total) + total) % total),
    [total],
  );

  // Auto-advance every 12s, pause on hover
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || total <= 1) return;
    const timer = setInterval(() => goTo(current + 1), 12_000);
    return () => clearInterval(timer);
  }, [current, paused, total, goTo]);

  if (total === 0) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/50">
        <p className="text-sm text-muted-foreground">
          Geen meetings gevonden in de afgelopen 3 dagen.
        </p>
      </div>
    );
  }

  const meeting = meetings[current];
  const counts = extractionCounts[meeting.id];

  return (
    <div
      className="group relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          Meetings &middot; {dayLabel}
        </h2>
        <span className="text-xs text-muted-foreground/60">
          {current + 1} / {total}
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
        {/* Navigation arrows — visible on hover */}
        {total > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goTo(current - 1)}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Vorige meeting"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goTo(current + 1)}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Volgende meeting"
            >
              <ChevronRight className="size-5" />
            </Button>
          </>
        )}

        <Link href={`/meetings/${meeting.id}`} className="block">
          <div className="px-8 pb-6 pt-7">
            {/* Header: title + meta */}
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-semibold leading-snug">
                  {meeting.title ?? "Untitled meeting"}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {meeting.organization && (
                    <span className="flex items-center gap-1">
                      <Building2 className="size-3" />
                      {meeting.organization.name}
                    </span>
                  )}
                  {meeting.date && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {formatDateShort(meeting.date)}
                    </span>
                  )}
                  {meeting.meeting_type && (
                    <Badge variant="outline" className="h-4 text-[10px]">
                      {meeting.meeting_type}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Briefing text */}
            <p className="text-[15px] leading-relaxed text-foreground/85">{meeting.ai_briefing}</p>

            {/* Extraction pills */}
            {counts && (
              <div className="mt-4 flex flex-wrap gap-2">
                {(Object.entries(counts) as [keyof ExtractionCounts, number][])
                  .filter(([, count]) => count > 0)
                  .map(([type, count]) => (
                    <span
                      key={type}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${EXTRACTION_LABELS[type].className}`}
                    >
                      {count} {EXTRACTION_LABELS[type].label}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </Link>

        {/* Pagination dots */}
        {total > 1 && (
          <div className="flex items-center justify-center gap-1.5 border-t border-border/30 py-3">
            {meetings.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === current
                    ? "w-6 bg-primary"
                    : "w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40"
                }`}
                aria-label={`Ga naar meeting ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

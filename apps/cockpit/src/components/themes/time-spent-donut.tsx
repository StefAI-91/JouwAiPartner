"use client";

import Link from "next/link";
import { useState } from "react";
import type { ThemeShareSlice } from "@repo/database/queries/themes";
import { buildSegments } from "./donut-segments";

const CIRCLE_R = 54;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;
const LEGEND_MAX = 6;
const MIN_SLICES_FOR_DISTRIBUTION = 3;

export interface TimeSpentDonutProps {
  slices: ThemeShareSlice[];
  totalMentions: number;
  windowDays: number;
}

/**
 * B8 uit PRD §8: donut die laat zien waar het gespreksvolume van de laatste
 * N dagen naartoe gaat. Client-component vanwege hover-tooltip op segmenten.
 *
 * Drie zichtbare states:
 *  - 0 slices → empty-state (komt zelden voor, want caller rendert alleen
 *    wanneer er data is, maar defensief voor edge cases).
 *  - <3 slices → één cirkel + melding "te weinig data" (UI-263): een 2-slice
 *    donut is visueel weinig informatief.
 *  - ≥3 slices → volle donut met legend.
 */
export function TimeSpentDonut({ slices, totalMentions, windowDays }: TimeSpentDonutProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (totalMentions === 0 || slices.length === 0) {
    return (
      <aside
        aria-label="Time-spent donut"
        className="rounded-xl border border-border/60 bg-muted/20 p-5"
      >
        <p className="text-[13px] text-muted-foreground">
          Nog geen thema-data voor de laatste {windowDays} dagen.
        </p>
      </aside>
    );
  }

  if (slices.length < MIN_SLICES_FOR_DISTRIBUTION) {
    return (
      <aside
        aria-label="Time-spent donut"
        className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-5"
      >
        <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
          <circle cx="70" cy="70" r={CIRCLE_R} fill="none" stroke="#e5e7eb" strokeWidth="20" />
          <text
            x="70"
            y="68"
            textAnchor="middle"
            className="fill-foreground font-semibold"
            fontSize="16"
          >
            {windowDays} dgn
          </text>
          <text x="70" y="84" textAnchor="middle" className="fill-muted-foreground" fontSize="10">
            {totalMentions} matches
          </text>
        </svg>
        <p className="text-center text-[12px] text-muted-foreground">
          Te weinig data voor verdeling — minimaal 3 thema&apos;s nodig.
        </p>
      </aside>
    );
  }

  const segments = buildSegments(slices, CIRCUMFERENCE);
  const hovered = segments.find((s) => s.slice.theme.id === hoveredId);
  const topSixPercent = segments.slice(0, LEGEND_MAX).reduce((sum, s) => sum + s.percent, 0);
  const overflow = segments.length - LEGEND_MAX;

  return (
    <aside
      aria-label="Time-spent donut"
      className="flex items-center gap-6 rounded-xl border border-border/60 bg-muted/20 p-5"
    >
      <svg
        width="140"
        height="140"
        viewBox="0 0 140 140"
        role="img"
        aria-label={`Verdeling thema's over de laatste ${windowDays} dagen, ${totalMentions} matches totaal`}
      >
        <circle cx="70" cy="70" r={CIRCLE_R} fill="none" stroke="#e5e7eb" strokeWidth="20" />
        {segments.map((s) => (
          <Link
            key={s.slice.theme.id}
            href={`/themes/${s.slice.theme.slug}`}
            aria-label={`${s.slice.theme.name}: ${s.percent}%`}
          >
            <circle
              cx="70"
              cy="70"
              r={CIRCLE_R}
              fill="none"
              stroke={s.color}
              strokeWidth={s.slice.theme.id === hoveredId ? 22 : 20}
              strokeDasharray={`${s.dash} ${CIRCUMFERENCE - s.dash}`}
              strokeDashoffset={-s.offset}
              transform="rotate(-90 70 70)"
              className="cursor-pointer transition-[stroke-width] focus:outline-none"
              onMouseEnter={() => setHoveredId(s.slice.theme.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(s.slice.theme.id)}
              onBlur={() => setHoveredId(null)}
            />
          </Link>
        ))}
        <text
          x="70"
          y="68"
          textAnchor="middle"
          className="pointer-events-none fill-foreground font-semibold"
          fontSize="16"
        >
          {windowDays} dgn
        </text>
        <text
          x="70"
          y="84"
          textAnchor="middle"
          className="pointer-events-none fill-muted-foreground"
          fontSize="10"
        >
          {hovered
            ? `${hovered.percent}%`
            : `${topSixPercent}% top-${Math.min(LEGEND_MAX, segments.length)}`}
        </text>
      </svg>
      <ul className="flex-1 space-y-1">
        {segments.slice(0, LEGEND_MAX).map((s) => (
          <li key={s.slice.theme.id} className="flex items-center gap-2 text-[12px]">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <Link
              href={`/themes/${s.slice.theme.slug}`}
              className="flex-1 truncate text-foreground hover:text-primary hover:underline"
              onMouseEnter={() => setHoveredId(s.slice.theme.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {s.slice.theme.emoji} {s.slice.theme.name}
            </Link>
            <span className="font-mono text-[11px] text-muted-foreground">{s.percent}%</span>
          </li>
        ))}
        {overflow > 0 && (
          <li className="pt-1 text-[11px] text-muted-foreground/70">
            + {overflow} andere thema&apos;s
          </li>
        )}
      </ul>
    </aside>
  );
}

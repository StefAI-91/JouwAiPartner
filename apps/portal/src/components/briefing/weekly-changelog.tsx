import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@repo/ui/utils";
import type { ChangelogEntry } from "@repo/database/queries/portal";

interface WeeklyChangelogProps {
  entries: ChangelogEntry[];
  projectId: string;
  days?: number;
}

const DAY_SHORT = ["zo", "ma", "di", "wo", "do", "vr", "za"] as const;
const MONTH_NL = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
] as const;

function formatDayChip(iso: string): { day: string; date: number } {
  const d = new Date(iso);
  return { day: DAY_SHORT[d.getDay()], date: d.getDate() };
}

function formatRange(days: number): string {
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => `${d.getDate()} ${MONTH_NL[d.getMonth()]}`;
  return `${fmt(start)} — ${fmt(end)}`;
}

function entryHref(entry: ChangelogEntry, projectId: string): string {
  // Meetings linken naar het overzicht — daar staan de samenvattingen netjes
  // gerenderd. Topics naar hun roadmap-detail. Eén klik door, leesbare body
  // op de bestemming.
  return entry.kind === "meeting"
    ? `/projects/${projectId}/meetings`
    : `/projects/${projectId}/roadmap/${entry.id}`;
}

/**
 * CP-010 — "Deze week gebeurd": editorial bullet-feed met datum-chips.
 * Eén regel per gebeurtenis (titel + label), klikbaar naar de bron. Bewust
 * géén meeting-summary inline: die markdown is te lang en te ruisig voor
 * een changelog. De klant klikt door voor de details.
 */
export function WeeklyChangelog({ entries, projectId, days = 7 }: WeeklyChangelogProps) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Deze week gebeurd</h2>
        <span className="text-xs text-muted-foreground">{formatRange(days)}</span>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card px-4 py-5 text-center text-sm text-muted-foreground">
          Rustige week — geen afgeronde items of klant-meetings.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-soft">
          <ul className="divide-y divide-border">
            {entries.map((entry) => {
              const chip = formatDayChip(entry.date);
              const isClosed = entry.kind === "topic_closed";
              return (
                <li key={`${entry.kind}-${entry.id}`}>
                  <Link
                    href={entryHref(entry, projectId)}
                    className="flex items-start gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40"
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-7 shrink-0 flex-col items-center justify-center rounded-full text-[10px] font-semibold leading-tight",
                        isClosed ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <span>{chip.day}</span>
                      <span>{chip.date}</span>
                    </span>
                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm font-medium">{entry.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {isClosed ? "Afgerond" : "Klant-meeting"}
                      </p>
                    </div>
                    <ArrowUpRight
                      className="mt-1 size-4 shrink-0 text-muted-foreground/50"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

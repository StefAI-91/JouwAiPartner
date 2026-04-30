import { cn } from "@repo/ui/utils";
import type { ChangelogEntry } from "@repo/database/queries/portal";

interface WeeklyChangelogProps {
  entries: ChangelogEntry[];
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

/**
 * CP-010 — "Deze week gebeurd": editorial bullet-feed met datum-chips.
 * Toont topics afgesloten + client-meetings in venster, gemerged op datum
 * desc door de query. Empty-state subtiel zodat een rustige week niet als
 * leegte voelt.
 */
export function WeeklyChangelog({ entries, days = 7 }: WeeklyChangelogProps) {
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
                <li
                  key={`${entry.kind}-${entry.id}`}
                  className="flex items-start gap-4 px-5 py-3.5"
                >
                  <span
                    className={cn(
                      "mt-1 inline-flex size-7 shrink-0 flex-col items-center justify-center rounded-full text-[10px] font-semibold leading-tight",
                      isClosed ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <span>{chip.day}</span>
                    <span>{chip.date}</span>
                  </span>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">{entry.title}</span>
                      {entry.summary ? (
                        <span className="text-muted-foreground"> — {entry.summary}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {isClosed ? "Afgerond" : "Klant-meeting"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

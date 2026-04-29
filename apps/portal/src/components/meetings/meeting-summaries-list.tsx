import { CalendarDays, CheckCircle2, ListChecks } from "lucide-react";
import type { ProjectSegment } from "@repo/database/queries/meetings";

interface MeetingSummariesListProps {
  segments: ProjectSegment[];
}

const DATE_FORMATTER = new Intl.DateTimeFormat("nl-NL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return DATE_FORMATTER.format(date);
}

export function MeetingSummariesList({ segments }: MeetingSummariesListProps) {
  if (segments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
        <CalendarDays className="mx-auto mb-3 size-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Nog geen meeting-samenvattingen</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Zodra er een meeting is geverifieerd verschijnt hier de samenvatting.
        </p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {segments.map((segment) => {
        const dateLabel = formatDate(segment.meeting_date);
        const heading = segment.meeting_title?.trim() || "Meeting";

        return (
          <li key={segment.id} className="overflow-hidden rounded-lg border border-border bg-card">
            <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border bg-muted/20 px-5 py-3">
              <h3 className="text-base font-semibold text-foreground">{heading}</h3>
              {dateLabel ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  {dateLabel}
                </span>
              ) : null}
            </header>

            <div className="grid gap-px bg-border md:grid-cols-2">
              <SummarySection
                icon={ListChecks}
                title="Kernpunten"
                items={segment.kernpunten}
                emptyText="Geen kernpunten vastgelegd."
              />
              <SummarySection
                icon={CheckCircle2}
                title="Vervolgstappen"
                items={segment.vervolgstappen}
                emptyText="Geen vervolgstappen vastgelegd."
                accent="text-primary"
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function SummarySection({
  icon: Icon,
  title,
  items,
  emptyText,
  accent = "text-muted-foreground",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
  emptyText: string;
  accent?: string;
}) {
  return (
    <section className="bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`size-4 ${accent}`} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-2 text-sm leading-relaxed text-foreground/90">
          {items.map((item, index) => (
            <li key={index} className="flex gap-2">
              <span
                aria-hidden
                className="mt-[7px] size-1.5 shrink-0 rounded-full bg-foreground/30"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

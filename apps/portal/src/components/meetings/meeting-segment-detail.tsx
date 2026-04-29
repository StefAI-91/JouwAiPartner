import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle2, ListChecks } from "lucide-react";
import type { PortalMeetingSegment } from "@repo/database/queries/portal";

interface MeetingSegmentDetailProps {
  segment: PortalMeetingSegment;
  projectId: string;
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

export function MeetingSegmentDetail({ segment, projectId }: MeetingSegmentDetailProps) {
  const heading = segment.meeting_title?.trim() || "Meeting";
  const dateLabel = formatDate(segment.meeting_date);

  return (
    <article className="flex flex-col gap-6">
      <Link
        href={`/projects/${projectId}/meetings`}
        className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Terug naar alle meetings
      </Link>

      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">{heading}</h2>
        {dateLabel ? (
          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            {dateLabel}
          </p>
        ) : null}
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
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
    </article>
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
    <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-soft">
      <header className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
        <Icon className={`size-4 ${accent}`} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">{items.length}</span>
      </header>
      <div className="px-5 py-4">
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
      </div>
    </section>
  );
}

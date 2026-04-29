import Link from "next/link";
import { CalendarDays, ChevronRight, ListChecks, CheckCircle2 } from "lucide-react";
import type { PortalMeetingSegment } from "@repo/database/queries/portal";

interface MeetingSummariesListProps {
  segments: PortalMeetingSegment[];
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

export function MeetingSummariesList({ segments, projectId }: MeetingSummariesListProps) {
  if (segments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
        <CalendarDays className="mx-auto mb-3 size-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Nog geen klant-meetings</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Zodra er een meeting met jullie geverifieerd is, verschijnt de samenvatting hier.
        </p>
      </div>
    );
  }

  return (
    <ol className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-soft">
      {segments.map((segment, index) => {
        const dateLabel = formatDate(segment.meeting_date);
        const heading = segment.meeting_title?.trim() || "Meeting";
        const isLast = index === segments.length - 1;

        return (
          <li key={segment.id} className={isLast ? "" : "border-b border-border/60"}>
            <Link
              href={`/projects/${projectId}/meetings/${segment.id}`}
              className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-foreground">{heading}</h3>
                {dateLabel ? (
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {dateLabel}
                  </p>
                ) : null}
              </div>
              <div className="hidden shrink-0 items-center gap-4 text-xs text-muted-foreground sm:flex">
                <CountChip icon={ListChecks} count={segment.kernpunten.length} label="kernpunten" />
                <CountChip
                  icon={CheckCircle2}
                  count={segment.vervolgstappen.length}
                  label="vervolgstappen"
                />
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function CountChip({
  icon: Icon,
  count,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-3.5" />
      <span className="font-medium text-foreground">{count}</span>
      <span>{label}</span>
    </span>
  );
}

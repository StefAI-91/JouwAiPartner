import { CalendarCheck, CalendarClock, Calendar } from "lucide-react";
import { cn } from "@repo/ui/utils";
import type { SprintWithTopics } from "@repo/database/queries/sprints";

interface SprintTimelineProps {
  sprints: SprintWithTopics[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_FORMATTER = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
});

function weekRange(deliveryWeek: string): string {
  const [year, month, day] = deliveryWeek.split("-").map(Number);
  const monday = new Date(Date.UTC(year, month - 1, day));
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  return `${DATE_FORMATTER.format(monday)} – ${DATE_FORMATTER.format(sunday)}`;
}

const STATUS_META = {
  delivered: {
    label: "Opgeleverd",
    icon: CalendarCheck,
    badgeClass: "bg-emerald-100 text-emerald-800",
    cardClass: "border-emerald-200 bg-emerald-50/50",
  },
  in_progress: {
    label: "Loopt nu",
    icon: CalendarClock,
    badgeClass: "bg-amber-100 text-amber-800",
    cardClass: "border-amber-300 bg-amber-50 ring-2 ring-amber-200/50",
  },
  planned: {
    label: "Gepland",
    icon: Calendar,
    badgeClass: "bg-gray-100 text-gray-700",
    cardClass: "border-gray-200 bg-white",
  },
} as const;

/**
 * CP-012 — Sprint-tijdlijn op de roadmap-pagina (in dev-modus). Lijst van
 * sprints chronologisch op `order_index`. Per sprint: status-icoon, naam,
 * opleverweek, samenvatting en een lijstje gekoppelde topic-titels (voor
 * "wat zit erin?").
 *
 * Geen empty-state binnenin — caller checkt `.length > 0` en toont anders
 * een hogere-niveau message.
 */
export function SprintTimeline({ sprints }: SprintTimelineProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Wat en wanneer</h2>
        <span className="text-xs text-muted-foreground">
          {sprints.length} {sprints.length === 1 ? "sprint" : "sprints"}
        </span>
      </div>

      <ol className="flex flex-col gap-3">
        {sprints.map((sprint) => {
          const meta =
            STATUS_META[sprint.status as keyof typeof STATUS_META] ?? STATUS_META.planned;
          const Icon = meta.icon;
          return (
            <li key={sprint.id} className={cn("rounded-lg border p-4 shadow-soft", meta.cardClass)}>
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md",
                    meta.badgeClass,
                  )}
                  aria-hidden
                >
                  <Icon className="size-3.5" strokeWidth={2.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold">{sprint.name}</h3>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        meta.badgeClass,
                      )}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Week van {weekRange(sprint.delivery_week)}
                  </p>
                  {sprint.summary ? (
                    <p className="mt-2 text-sm text-foreground/85">{sprint.summary}</p>
                  ) : null}
                  {sprint.topics.length > 0 ? (
                    <ul className="mt-3 flex flex-col gap-1.5 border-t border-border/60 pt-3 text-sm">
                      {sprint.topics.map((topic) => (
                        <li key={topic.id} className="flex items-baseline gap-2">
                          <span className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                          <span className="text-foreground/85">
                            {topic.client_title ?? topic.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

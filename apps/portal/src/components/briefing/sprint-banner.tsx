import { CalendarClock } from "lucide-react";
import type { SprintRow } from "@repo/database/queries/sprints";

interface SprintBannerProps {
  sprint: SprintRow;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const FORMATTER = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
});

function formatWeekOf(deliveryWeek: string): string {
  const [year, month, day] = deliveryWeek.split("-").map(Number);
  const monday = new Date(Date.UTC(year, month - 1, day));
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  return `${FORMATTER.format(monday)} – ${FORMATTER.format(sunday)}`;
}

/**
 * CP-012 — Sprint-banner bovenaan de portal-briefing in dev-modus. Toont de
 * "huidige" sprint (status `in_progress`); als die er niet is, rendert de
 * caller deze component niet. Bewust geen status-badge — als hij zichtbaar
 * is, loopt hij per definitie. Geen eigen empty-state binnenin.
 */
export function SprintBanner({ sprint }: SprintBannerProps) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-200/60 text-amber-800">
          <CalendarClock className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-amber-900">
              Huidige sprint: {sprint.name}
            </h2>
            <span className="text-xs font-medium text-amber-800">
              Oplevering week van {formatWeekOf(sprint.delivery_week)}
            </span>
          </div>
          {sprint.summary ? (
            <p className="mt-1 text-sm text-amber-900/80">{sprint.summary}</p>
          ) : (
            <p className="mt-1 text-sm italic text-amber-800/70">
              Het team werkt aan deze sprint. Hieronder zie je wat je al kunt testen.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

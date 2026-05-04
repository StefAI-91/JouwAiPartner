"use client";

import { useState } from "react";
import { ChevronDown, Bug, Sparkles, Package } from "lucide-react";
import { cn } from "@repo/ui/utils";
import type { BriefingSprint, BriefingTopic } from "@repo/database/queries/portal";

export type ReadyToTestItem =
  | { kind: "sprint"; sprint: BriefingSprint }
  | { kind: "topic"; topic: BriefingTopic };

interface ReadyToTestCardProps {
  item: ReadyToTestItem;
  defaultOpen?: boolean;
}

const TOPIC_BADGE: Record<string, { label: string; icon: typeof Sparkles; className: string }> = {
  feature: {
    label: "Feature",
    icon: Sparkles,
    className: "bg-primary/10 text-primary",
  },
  bug: {
    label: "Bug",
    icon: Bug,
    className: "bg-rose-50 text-rose-700",
  },
};

const SPRINT_BADGE = {
  label: "Sprint",
  icon: Package,
  className: "bg-amber-100 text-amber-800",
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_FORMATTER = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long" });

function weekRange(deliveryWeek: string): string {
  const [year, month, day] = deliveryWeek.split("-").map(Number);
  const monday = new Date(Date.UTC(year, month - 1, day));
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  return `${WEEK_FORMATTER.format(monday)} – ${WEEK_FORMATTER.format(sunday)}`;
}

/**
 * CP-010 + CP-012 follow-up — uitklap-bare card voor "Klaar om te testen".
 * Render-verschillen tussen sprint- en topic-items zitten alleen in:
 * - badge-icoon en kleur
 * - extra subtitel (sprint krijgt opleverweek; topic krijgt niets)
 * - titel/beschrijving-bron
 *
 * Beide vallen netjes onder dezelfde structuur zodat de klant geen
 * conceptueel verschil ervaart — "wat kan ik testen" is de vraag, niet
 * "is dit een sprint of een topic".
 */
export function ReadyToTestCard({ item, defaultOpen = false }: ReadyToTestCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  const view =
    item.kind === "sprint"
      ? {
          title: item.sprint.name,
          description: item.sprint.summary,
          subtitle: `Oplevering week van ${weekRange(item.sprint.delivery_week)}`,
          instructions: item.sprint.client_test_instructions ?? "",
          badge: SPRINT_BADGE,
        }
      : {
          title: item.topic.client_title ?? item.topic.title,
          description: item.topic.client_description,
          subtitle: null,
          instructions: item.topic.client_test_instructions ?? "",
          badge: TOPIC_BADGE[item.topic.type] ?? TOPIC_BADGE.feature,
        };

  const Icon = view.badge.icon;

  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 text-left"
      >
        <span
          className={cn(
            "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md",
            view.badge.className,
          )}
          aria-hidden
        >
          <Icon className="size-3.5" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{view.title}</h3>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                view.badge.className,
              )}
            >
              {view.badge.label}
            </span>
          </div>
          {view.subtitle ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{view.subtitle}</p>
          ) : null}
          {view.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{view.description}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open ? "rotate-180" : "",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <p className="font-medium">Hoe te testen</p>
          <p className="whitespace-pre-wrap text-muted-foreground">{view.instructions}</p>
        </div>
      ) : null}
    </article>
  );
}

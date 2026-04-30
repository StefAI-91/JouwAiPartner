"use client";

import { useState } from "react";
import { ChevronDown, Bug, Sparkles } from "lucide-react";
import { cn } from "@repo/ui/utils";
import type { BriefingTopic } from "@repo/database/queries/portal";

interface ReadyToTestCardProps {
  topic: BriefingTopic;
  defaultOpen?: boolean;
}

const TYPE_BADGE: Record<string, { label: string; icon: typeof Sparkles; className: string }> = {
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

/**
 * CP-010 — Topic-card met uitklap-bare test-instructies. Client component
 * voor de toggle-state. Eerste card wordt door de parent op `defaultOpen`
 * gezet zodat de klant meteen het patroon ziet.
 */
export function ReadyToTestCard({ topic, defaultOpen = false }: ReadyToTestCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = TYPE_BADGE[topic.type] ?? TYPE_BADGE.feature;
  const Icon = meta.icon;

  const title = topic.client_title ?? topic.title;
  const description = topic.client_description;
  const instructions = topic.client_test_instructions ?? "";

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
            meta.className,
          )}
          aria-hidden
        >
          <Icon className="size-3.5" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{title}</h3>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                meta.className,
              )}
            >
              {meta.label}
            </span>
          </div>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
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
          <p className="whitespace-pre-wrap text-muted-foreground">{instructions}</p>
        </div>
      ) : null}
    </article>
  );
}

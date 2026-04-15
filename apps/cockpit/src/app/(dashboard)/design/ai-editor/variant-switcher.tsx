"use client";

import { useState } from "react";
import { BubbleVariant } from "@/components/meetings/ai-summary-editor/variants/bubble-variant";
import { TimelineVariant } from "@/components/meetings/ai-summary-editor/variants/timeline-variant";
import { SplitVariant } from "@/components/meetings/ai-summary-editor/variants/split-variant";

type VariantKey = "bubble" | "timeline" | "split";

interface Variant {
  key: VariantKey;
  label: string;
  subtitle: string;
  description: string;
}

const VARIANTS: Variant[] = [
  {
    key: "bubble",
    label: "Bubbels",
    subtitle: "Huidig",
    description:
      "Chat-app esthetiek met user-bubbles rechts, AI-avatar links. Speels, herkenbaar, uitnodigend.",
  },
  {
    key: "timeline",
    label: "Timeline",
    subtitle: "Minimaal",
    description:
      "Geen bubbels, alles op één platte log met timestamps. Meer context per scherm, zakelijker.",
  },
  {
    key: "split",
    label: "Split editor",
    subtitle: "Document",
    description:
      "Summary links, AI rechts. Gewijzigde secties lichten op. Notion / Google Docs gevoel.",
  },
];

export function VariantSwitcher() {
  const [active, setActive] = useState<VariantKey>("bubble");

  return (
    <div className="space-y-6">
      {/* Switcher */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {VARIANTS.map((v) => (
          <button
            key={v.key}
            onClick={() => setActive(v.key)}
            className={
              active === v.key
                ? "rounded-xl border border-primary bg-primary/5 p-4 text-left ring-1 ring-primary transition-all"
                : "rounded-xl border border-border bg-background p-4 text-left transition-all hover:border-border/80 hover:bg-muted/40"
            }
          >
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-foreground">{v.label}</span>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {v.subtitle}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{v.description}</p>
          </button>
        ))}
      </div>

      {/* Active variant */}
      <div>
        {active === "bubble" && <BubbleVariant />}
        {active === "timeline" && <TimelineVariant />}
        {active === "split" && <SplitVariant />}
      </div>
    </div>
  );
}

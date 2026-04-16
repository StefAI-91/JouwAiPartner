"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { dismissInsightAction } from "@/actions/management-insights";

type SignalColor = "positief" | "neutraal" | "risico";
type TrendColor = "escalerend" | "stabiel" | "afnemend";

const SIGNAL_STYLES: Record<SignalColor, string> = {
  positief: "bg-emerald-50 text-emerald-700",
  neutraal: "bg-blue-50 text-blue-700",
  risico: "bg-amber-50 text-amber-700",
};

const TREND_STYLES: Record<TrendColor, string> = {
  escalerend: "bg-amber-50 text-amber-700",
  stabiel: "bg-blue-50 text-blue-700",
  afnemend: "bg-emerald-50 text-emerald-700",
};

const SIGNAL_LABELS: Record<SignalColor, string> = {
  positief: "Positief",
  neutraal: "Neutraal",
  risico: "Risico",
};

const TREND_LABELS: Record<TrendColor, string> = {
  escalerend: "Escalerend",
  stabiel: "Stabiel",
  afnemend: "Afnemend",
};

interface InsightRowProps {
  insightKey: string;
  title: string;
  subtitle: string;
  badge?: { label: string; style: string };
}

function InsightRow({ insightKey, title, subtitle, badge }: InsightRowProps) {
  const [dismissed, setDismissed] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  async function handleDismiss() {
    setDismissing(true);
    try {
      const res = await dismissInsightAction({ insightKey });
      if ("success" in res) {
        setDismissed(true);
      }
    } catch {
      // silently fail
    } finally {
      setDismissing(false);
    }
  }

  if (dismissed) return null;

  return (
    <div className="group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-xs font-medium text-foreground">{title}</p>
          {badge && (
            <span
              className={`inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${badge.style}`}
            >
              {badge.label}
            </span>
          )}
        </div>
        <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
      <button
        onClick={handleDismiss}
        disabled={dismissing}
        className="shrink-0 rounded p-0.5 text-muted-foreground/0 transition-all group-hover:text-muted-foreground/40 hover:!bg-muted hover:!text-muted-foreground disabled:opacity-50"
        title="Verberg"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function OpvolgingItem({
  insight,
}: {
  insight: { key: string; onderwerp: string; context: string; laatst_besproken: string };
}) {
  return (
    <InsightRow
      insightKey={insight.key}
      title={insight.onderwerp}
      subtitle={truncate(insight.context, 60)}
    />
  );
}

export function PipelineItem({
  insight,
}: {
  insight: {
    key: string;
    naam: string;
    status_samenvatting: string;
    laatst_besproken: string;
    signaal: SignalColor;
  };
}) {
  return (
    <InsightRow
      insightKey={insight.key}
      title={insight.naam}
      subtitle={truncate(insight.status_samenvatting, 55)}
      badge={{ label: SIGNAL_LABELS[insight.signaal], style: SIGNAL_STYLES[insight.signaal] }}
    />
  );
}

export function ThemaItem({
  insight,
}: {
  insight: {
    key: string;
    thema: string;
    frequentie: number;
    trend: TrendColor;
    toelichting: string;
  };
}) {
  return (
    <InsightRow
      insightKey={insight.key}
      title={insight.thema}
      subtitle={`${insight.frequentie}x — ${truncate(insight.toelichting, 45)}`}
      badge={{ label: TREND_LABELS[insight.trend], style: TREND_STYLES[insight.trend] }}
    />
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}...`;
}

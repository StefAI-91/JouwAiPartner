import { Bell, Building, TrendingUp, Sparkles } from "lucide-react";
import { OpvolgingItem, PipelineItem, ThemaItem } from "./management-insight-card";
import type { ManagementInsightsOutput } from "@repo/ai/agents/management-insights";

interface ManagementInsightsPanelProps {
  insights: ManagementInsightsOutput | null;
  dismissedKeys: string[];
  generatedAt: string | null;
}

export function ManagementInsightsPanel({
  insights,
  dismissedKeys,
  generatedAt,
}: ManagementInsightsPanelProps) {
  if (!insights) {
    return (
      <div className="rounded-xl border border-dashed border-muted-foreground/20 bg-muted/30 p-8 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/30" />
        <h2 className="mt-3 text-base font-medium text-foreground/70">Nog geen inzichten</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Klik op &ldquo;Genereer inzichten&rdquo; om cross-meeting patronen te analyseren.
        </p>
      </div>
    );
  }

  const dismissed = new Set(dismissedKeys);

  const opvolging = insights.mogelijke_opvolging.filter((i) => !dismissed.has(i.key));
  const pipeline = insights.klant_pipeline.filter((i) => !dismissed.has(i.key));
  const themas = insights.terugkerende_themas.filter((i) => !dismissed.has(i.key));

  const totalVisible = opvolging.length + pipeline.length + themas.length;

  if (totalVisible === 0) {
    return (
      <div className="rounded-xl border border-dashed border-muted-foreground/20 bg-muted/30 p-6 text-center">
        <p className="text-xs text-muted-foreground">
          Alle inzichten zijn verborgen. Genereer opnieuw voor een verse analyse.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.week_samenvatting_lang && (
        <div className="rounded-xl border border-border/40 bg-white px-5 py-4 shadow-sm">
          <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
            {insights.week_samenvatting_lang}
          </p>
          {generatedAt && (
            <p className="mt-1.5 text-[9px] text-muted-foreground/50">
              {formatDateTime(generatedAt)}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {opvolging.length > 0 && (
          <InsightColumn
            icon={<Bell className="h-3.5 w-3.5" />}
            title="Mogelijke opvolging"
            count={opvolging.length}
          >
            {opvolging.map((item) => (
              <OpvolgingItem key={item.key} insight={item} />
            ))}
          </InsightColumn>
        )}

        {pipeline.length > 0 && (
          <InsightColumn
            icon={<Building className="h-3.5 w-3.5" />}
            title="Klant pipeline"
            count={pipeline.length}
          >
            {pipeline.map((item) => (
              <PipelineItem key={item.key} insight={item} />
            ))}
          </InsightColumn>
        )}

        {themas.length > 0 && (
          <InsightColumn
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            title="Terugkerende thema's"
            count={themas.length}
          >
            {themas.map((item) => (
              <ThemaItem key={item.key} insight={item} />
            ))}
          </InsightColumn>
        )}
      </div>
    </div>
  );
}

function InsightColumn({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-primary/50">{icon}</span>
        <h3 className="text-xs font-semibold text-foreground">{title}</h3>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

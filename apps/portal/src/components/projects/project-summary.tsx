import { Sparkles } from "lucide-react";
import { formatDate } from "@repo/ui/format";

interface ProjectSummaryProps {
  summary: { content: string; created_at: string } | null;
}

export function ProjectSummary({ summary }: ProjectSummaryProps) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="size-4 text-primary" />
        AI-samenvatting
      </div>
      {summary ? (
        <>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {summary.content}
          </p>
          <p className="text-xs text-muted-foreground">
            Bijgewerkt op {formatDate(summary.created_at)}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Er is nog geen samenvatting beschikbaar voor dit project. Zodra er meer informatie is
          verzameld verschijnt hier automatisch een overzicht.
        </p>
      )}
    </section>
  );
}

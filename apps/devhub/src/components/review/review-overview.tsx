"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RefreshCw, Clock } from "lucide-react";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/utils";
import type { ProjectReviewRow } from "@repo/database/queries/project-reviews";
import { generateProjectReview } from "@/actions/review";
import { MetricsGrid } from "./metrics-grid";
import { HealthScore } from "./health-score";
import { PatternsList } from "./patterns-list";
import { RisksList } from "./risks-list";
import { ActionItemsList } from "./action-items-list";

interface ReviewOverviewProps {
  projectId: string;
  projectName: string;
  review: ProjectReviewRow | null;
  counts: {
    triage: number;
    backlog: number;
    todo: number;
    in_progress: number;
    done: number;
    cancelled: number;
  };
}

export function ReviewOverview({ projectId, projectName, review, counts }: ReviewOverviewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const result = await generateProjectReview({ projectId });
      if ("error" in result) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const totalOpen = counts.triage + counts.backlog + counts.todo + counts.in_progress;

  return (
    <div className="flex flex-col gap-6">
      {/* Metrics cards */}
      <MetricsGrid counts={counts} totalOpen={totalOpen} />

      {/* Generate / refresh button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleGenerate} disabled={isPending}>
          {isPending ? (
            <>
              <RefreshCw className="size-4 animate-spin" />
              Analyseren...
            </>
          ) : review ? (
            <>
              <RefreshCw className="size-4" />
              Vernieuw analyse
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Genereer AI review
            </>
          )}
        </Button>
        {review && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {new Date(review.created_at).toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* AI Analysis */}
      {review && (
        <>
          {/* Health score + summary */}
          <HealthScore
            score={review.health_score}
            label={review.health_label}
            summary={review.summary}
          />

          {/* Three columns: patterns, risks, action items */}
          <div className="grid gap-6 lg:grid-cols-3">
            <PatternsList patterns={review.patterns} />
            <RisksList risks={review.risks} />
            <ActionItemsList actionItems={review.action_items} projectId={projectId} />
          </div>
        </>
      )}

      {/* Empty state */}
      {!review && !isPending && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Sparkles className="size-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">Nog geen AI review</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Klik op &quot;Genereer AI review&quot; om {projectName} te laten analyseren
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Sparkles, Clock } from "lucide-react";
import { Button } from "@repo/ui/button";
import { generateProjectReview } from "@/features/review/actions/review";

interface DashboardHeaderProps {
  projectId: string;
  projectName: string;
  lastReviewAt: string | null;
}

export function DashboardHeader({ projectId, projectName, lastReviewAt }: DashboardHeaderProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const result = await generateProjectReview({ projectId });
      if ("error" in result) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overzicht en AI-inzichten voor {projectName}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {lastReviewAt && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {new Date(lastReviewAt).toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
        <Button size="sm" onClick={handleGenerate} disabled={isPending}>
          {isPending ? (
            <>
              <RefreshCw className="size-3.5 animate-spin" />
              Analyseren...
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" />
              {lastReviewAt ? "Vernieuw analyse" : "Genereer analyse"}
            </>
          )}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}

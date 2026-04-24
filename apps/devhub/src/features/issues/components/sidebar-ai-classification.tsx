"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@repo/ui/button";
import { classifyIssueAction } from "../actions/classify";

interface SidebarAiClassificationProps {
  issueId: string;
  aiClassification: Record<string, unknown> | null;
  isPending: boolean;
}

export function SidebarAiClassification({
  issueId,
  aiClassification,
  isPending,
}: SidebarAiClassificationProps) {
  const [, startTransition] = useTransition();
  const [isClassifying, setIsClassifying] = useState(false);

  function handleClassify() {
    setIsClassifying(true);
    startTransition(async () => {
      const result = await classifyIssueAction({ id: issueId });
      if ("error" in result) {
        console.error(result.error);
      }
      setIsClassifying(false);
    });
  }

  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">AI Classificatie</span>
      {aiClassification ? (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {typeof aiClassification.confidence === "number" && (
            <p>Confidence: {Math.round(aiClassification.confidence * 100)}%</p>
          )}
          {typeof aiClassification.type === "string" && <p>AI type: {aiClassification.type}</p>}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/60">Nog niet geclassificeerd</p>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClassify}
        disabled={isPending || isClassifying}
        className="text-muted-foreground hover:text-foreground"
      >
        <Sparkles className="size-3.5" />
        {isClassifying ? "Bezig..." : aiClassification ? "Herclassificeer" : "Classificeer"}
      </Button>
    </div>
  );
}

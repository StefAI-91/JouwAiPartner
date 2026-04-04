"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { regenerateSummaryAction } from "@/actions/summaries";

interface RegenerateSummaryButtonProps {
  entityType: "project" | "organization";
  entityId: string;
}

export function RegenerateSummaryButton({ entityType, entityId }: RegenerateSummaryButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  function handleClick() {
    setStatus("idle");
    startTransition(async () => {
      const result = await regenerateSummaryAction({ entityType, entityId });
      if ("error" in result) {
        setStatus("error");
        console.error("Summary generation failed:", result.error);
      } else {
        setStatus("success");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-md border border-border/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      <RefreshCw className={`h-3 w-3 ${isPending ? "animate-spin" : ""}`} />
      {isPending
        ? "Genereren..."
        : status === "success"
          ? "Samenvatting bijgewerkt!"
          : status === "error"
            ? "Mislukt — probeer opnieuw"
            : "Genereer samenvatting"}
    </button>
  );
}

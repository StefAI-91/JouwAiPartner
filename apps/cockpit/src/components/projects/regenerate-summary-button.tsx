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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleClick() {
    setStatus("idle");
    setErrorMessage(null);
    startTransition(async () => {
      const result = await regenerateSummaryAction({ entityType, entityId });
      if ("error" in result) {
        setStatus("error");
        setErrorMessage(result.error);
      } else {
        setStatus("success");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
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
      {status === "error" && errorMessage && (
        <p className="max-w-xs text-[11px] text-red-500/80 text-right">{errorMessage}</p>
      )}
    </div>
  );
}

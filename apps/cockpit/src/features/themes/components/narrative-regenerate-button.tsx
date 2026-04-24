"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { regenerateThemeNarrativeAction } from "@/features/themes/actions";

export interface NarrativeRegenerateButtonProps {
  themeId: string;
}

/**
 * TH-014 (UI-406) — Admin-only regenerate-knop voor de Verhaal-tab. Icon +
 * label, discreet in de meta-rij rechtsboven de narrative. Optimistische UI:
 * disabled tijdens de transition, success/error als korte toast-achtige
 * status onder de knop.
 */
export function NarrativeRegenerateButton({ themeId }: NarrativeRegenerateButtonProps) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "error"; message: string } | { kind: "ok" }
  >({ kind: "idle" });

  function handleClick() {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await regenerateThemeNarrativeAction({ themeId });
      if ("error" in res) {
        setStatus({ kind: "error", message: res.error });
      } else {
        setStatus({ kind: "ok" });
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        title="Opnieuw genereren (admin)"
      >
        <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} aria-hidden="true" />
        <span>{pending ? "Genereren..." : "Regenereer"}</span>
      </button>
      {status.kind === "error" && (
        <span className="text-[11px] text-destructive" role="alert">
          {status.message}
        </span>
      )}
      {status.kind === "ok" && (
        <span className="text-[11px] text-success" role="status">
          Bijgewerkt
        </span>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { FilterX } from "lucide-react";
import { Button } from "@repo/ui/button";

export function ReclassifyButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    processed: number;
    filtered: number;
    kept: number;
  } | null>(null);

  async function handleReclassify() {
    if (
      !window.confirm(
        "Alle processed emails opnieuw door de filter-gatekeeper halen? Dit kan even duren.",
      )
    ) {
      return;
    }

    setRunning(true);
    setResult(null);

    try {
      const res = await fetch("/api/email/reclassify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ limit: 200, onlyKept: true }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Reclassify failed");
      }

      setResult({
        processed: data.processed ?? 0,
        filtered: data.filtered ?? 0,
        kept: data.kept ?? 0,
      });

      // Refresh de pagina zodat de tabs de nieuwe counts tonen
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error("Email reclassify failed:", err);
      setResult({ processed: 0, filtered: 0, kept: 0 });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleReclassify} disabled={running} variant="outline" size="sm">
        <FilterX className={`mr-2 h-4 w-4 ${running ? "animate-pulse" : ""}`} />
        {running ? "Herclassificeren…" : "Herclassificeer inbox"}
      </Button>
      {result && (
        <span className="text-xs text-muted-foreground">
          {result.processed} verwerkt · {result.filtered} gefilterd · {result.kept} behouden
        </span>
      )}
    </div>
  );
}

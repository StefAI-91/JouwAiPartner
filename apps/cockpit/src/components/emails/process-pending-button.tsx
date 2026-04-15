"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@repo/ui/button";

interface ProcessPendingButtonProps {
  pendingCount: number;
}

export function ProcessPendingButton({ pendingCount }: ProcessPendingButtonProps) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    processed: number;
    filtered: number;
    kept: number;
    remaining: number;
  } | null>(null);

  if (pendingCount === 0) return null;

  async function handleProcess() {
    setRunning(true);
    setResult(null);

    try {
      const res = await fetch("/api/email/process-pending", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ limit: 100 }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Process failed");
      }

      setResult({
        processed: data.processed ?? 0,
        filtered: data.filtered ?? 0,
        kept: data.kept ?? 0,
        remaining: data.remaining ?? 0,
      });

      // Laat UI de nieuwe counts tonen
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error("Email process-pending failed:", err);
      setResult({ processed: 0, filtered: 0, kept: 0, remaining: 0 });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleProcess} disabled={running} size="sm">
        <Sparkles className={`mr-2 h-4 w-4 ${running ? "animate-pulse" : ""}`} />
        {running ? "Verwerken…" : `Verwerk ${pendingCount} nieuwe`}
      </Button>
      {result && (
        <span className="text-xs text-muted-foreground">
          {result.processed} verwerkt · {result.filtered} gefilterd · {result.kept} behouden
          {result.remaining === -1 ? " (mogelijk nog meer — klik opnieuw)" : ""}
        </span>
      )}
    </div>
  );
}

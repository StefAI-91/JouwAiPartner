"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ fetched: number; processed: number } | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);

    try {
      const res = await fetch("/api/email/sync", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Sync failed");
      }

      setResult({ fetched: data.fetched ?? 0, processed: data.processed ?? 0 });
    } catch (err) {
      console.error("Email sync failed:", err);
      setResult({ fetched: 0, processed: 0 });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
        <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing..." : "Sync emails"}
      </Button>
      {result && (
        <span className="text-xs text-muted-foreground">
          {result.fetched} opgehaald, {result.processed} verwerkt
        </span>
      )}
    </div>
  );
}

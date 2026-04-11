"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, ImageDown } from "lucide-react";
import { Button } from "@repo/ui/button";
import { syncUserback, backfillMedia } from "@/actions/import";
import { cn } from "@repo/ui/utils";

interface SyncResult {
  imported: number;
  updated: number;
  skipped: number;
  total: number;
  classified: number;
  isInitial: boolean;
  errors: string[];
}

interface SyncCardProps {
  projectId: string;
  projectName: string;
  userbackProjectId: string;
  itemCount: number;
  lastSyncCursor: string | null;
}

export function SyncCard({
  projectId,
  projectName,
  userbackProjectId,
  itemCount,
  lastSyncCursor,
}: SyncCardProps) {
  const [syncing, setSyncing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [backfillResult, setBackfillResult] = useState<{
    processed: number;
    mediaStored: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    setBackfillResult(null);
    setError(null);

    const response = await syncUserback({ projectId, limit });

    if ("error" in response) {
      setError(response.error);
    } else {
      setResult(response.data);
    }

    setSyncing(false);
  }

  async function handleBackfill() {
    setBackfilling(true);
    setBackfillResult(null);
    setResult(null);
    setError(null);

    const response = await backfillMedia();

    if ("error" in response) {
      setError(response.error);
    } else {
      setBackfillResult(response.data);
    }

    setBackfilling(false);
  }

  return (
    <div className="rounded-lg border p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold">Userback Import</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Project: {projectName} (ID: {userbackProjectId})
          </p>
        </div>
      </div>

      {/* Status */}
      <div className="mt-4 space-y-1 text-xs text-muted-foreground">
        <p>
          Laatste sync:{" "}
          {lastSyncCursor
            ? new Date(lastSyncCursor).toLocaleString("nl-NL", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Nog niet gesynchroniseerd"}
        </p>
        <p>Items in DevHub: {itemCount}</p>
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="sync-limit" className="text-xs text-muted-foreground">
            Max items:
          </label>
          <select
            id="sync-limit"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            disabled={syncing}
            className="h-7 rounded-md border bg-background px-2 text-xs"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
          </select>
        </div>

        <Button onClick={handleSync} disabled={syncing || backfilling} size="sm">
          <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
          {syncing ? "Synchroniseren..." : "Sync nu"}
        </Button>

        <Button
          onClick={handleBackfill}
          disabled={syncing || backfilling}
          size="sm"
          variant="outline"
        >
          <ImageDown className={cn("size-3.5", backfilling && "animate-pulse")} />
          {backfilling ? "Media ophalen..." : "Backfill media"}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <div className="mt-4 rounded-md border bg-muted/30 p-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-green-700">
            <CheckCircle2 className="size-4" />
            Sync voltooid
          </div>
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            <p>{result.imported} nieuw geimporteerd</p>
            <p>{result.updated} bijgewerkt</p>
            <p>{result.skipped} overgeslagen</p>
            <p>
              AI classificatie: {result.classified}/{result.imported} afgerond
            </p>
            <p className="text-[0.65rem] pt-1">
              {result.isInitial ? "Eerste sync (volledige import)" : "Incremental sync"}
            </p>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-2 border-t pt-2">
              <p className="text-xs font-medium text-destructive">Fouten:</p>
              {result.errors.map((err, i) => (
                <p key={i} className="text-[0.65rem] text-destructive/80 break-all">
                  {err}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Backfill result */}
      {backfillResult && (
        <div className="mt-4 rounded-md border bg-muted/30 p-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-green-700">
            <CheckCircle2 className="size-4" />
            Media backfill voltooid
          </div>
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            <p>{backfillResult.processed} issues verwerkt</p>
            <p>{backfillResult.mediaStored} bestanden opgeslagen</p>
            <p>{backfillResult.skipped} overgeslagen</p>
          </div>
          {backfillResult.errors.length > 0 && (
            <div className="mt-2 border-t pt-2">
              <p className="text-xs font-medium text-destructive">Fouten:</p>
              {backfillResult.errors.map((err, i) => (
                <p key={i} className="text-[0.65rem] text-destructive/80 break-all">
                  {err}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 p-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-destructive">
            <AlertCircle className="size-4" />
            Sync mislukt
          </div>
          <p className="mt-1 text-xs text-destructive/80">{error}</p>
        </div>
      )}
    </div>
  );
}

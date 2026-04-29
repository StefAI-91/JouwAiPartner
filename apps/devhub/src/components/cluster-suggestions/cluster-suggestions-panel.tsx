"use client";

import { useCallback, useState, useTransition } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import {
  runBulkClusterCleanupAction,
  type BulkClusterRunResult,
} from "@/actions/bulk-cluster-cleanup";
import type { BulkClusterOutput } from "@repo/ai/validations/bulk-cluster-cleanup";
import { ClusterSuggestionCard } from "./cluster-suggestion-card";

type Cluster = BulkClusterOutput["clusters"][number];

export interface ClusterSuggestionsPanelProps {
  projectId: string;
  topics: { id: string; title: string }[];
  ungroupedOpenCount: number;
}

/**
 * PR-019 — On-demand cluster-paneel boven de issue-list. Verschijnt alleen
 * op `?ungrouped=true` met >=1 ungrouped open issue. Drie staten:
 *   - geen run: knop "Suggesties ophalen"
 *   - geladen: lijst cards + knop "Regenereer" + sluit-knop
 *   - leeg: melding dat Haiku niets heeft voorgesteld
 *
 * Suggesties zijn niet-persistent (PR-RULE-101). Bij refresh weg.
 */
export function ClusterSuggestionsPanel({
  projectId,
  topics,
  ungroupedOpenCount,
}: ClusterSuggestionsPanelProps) {
  const [clusters, setClusters] = useState<Cluster[] | null>(null);
  const [droppedExpired, setDroppedExpired] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchClusters = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const result: BulkClusterRunResult = await runBulkClusterCleanupAction({ projectId });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setClusters(result.clusters);
      setDroppedExpired(result.droppedExpired);
    });
  }, [projectId]);

  const removeCluster = useCallback((index: number) => {
    setClusters((prev) => {
      if (!prev) return prev;
      const next = prev.slice();
      next.splice(index, 1);
      return next;
    });
  }, []);

  const close = useCallback(() => {
    setClusters(null);
    setDroppedExpired(0);
    setError(null);
  }, []);

  const topicById = new Map(topics.map((t) => [t.id, t.title]));

  return (
    <section
      aria-label="Cluster-suggesties"
      className="rounded-lg border border-border bg-card/50 px-5 py-4"
    >
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" aria-hidden />
          <h2 className="text-base font-semibold">Cluster-suggesties (Haiku, batch)</h2>
        </div>
        <span className="text-sm text-muted-foreground">
          {ungroupedOpenCount} open ungrouped issue{ungroupedOpenCount === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {clusters === null ? (
            <button
              type="button"
              onClick={fetchClusters}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Suggesties ophalen
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={fetchClusters}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Regenereer
              </button>
              <button
                type="button"
                onClick={close}
                aria-label="Sluit paneel"
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </>
          )}
        </div>
      </header>

      {clusters === null ? (
        <p className="mt-3 text-sm italic text-muted-foreground">
          Klik op &quot;Suggesties ophalen&quot; om Haiku een batch-cluster-voorstel te laten doen.
          Niets wordt gekoppeld zonder dat jij per cluster akkoord geeft.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm italic text-muted-foreground">
            Suggesties zijn niet opgeslagen — accepteer of regenereer voordat je weggaat.
          </p>
          {droppedExpired > 0 && (
            <p className="mt-1.5 text-sm text-amber-600">
              {droppedExpired} cluster{droppedExpired === 1 ? "" : "s"} verlopen (topic verdwenen);
              regenereer voor een actuele lijst.
            </p>
          )}
          {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}

          {clusters.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Haiku heeft geen clusters voorgesteld voor deze issues.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {clusters.map((cluster, index) => (
                <li key={`${cluster.kind}-${index}`}>
                  <ClusterSuggestionCard
                    cluster={cluster}
                    projectId={projectId}
                    matchTitle={
                      cluster.kind === "match"
                        ? (topicById.get(cluster.match_topic_id) ?? null)
                        : null
                    }
                    onAccepted={() => removeCluster(index)}
                    onIgnored={() => removeCluster(index)}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {error && clusters === null && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </section>
  );
}

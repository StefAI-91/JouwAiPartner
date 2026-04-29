"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ExternalLink, Loader2, Sparkles, X } from "lucide-react";
import {
  runBulkClusterCleanupAction,
  type BulkClusterRunResult,
} from "@/actions/bulk-cluster-cleanup";
import type { BulkClusterOutput } from "@repo/ai/validations/bulk-cluster-cleanup";
import { cn } from "@repo/ui/utils";
import { ClusterSuggestionCard, type AcceptedNotice } from "./cluster-suggestion-card";

type Cluster = BulkClusterOutput["clusters"][number];

// Notice met stabiele lokale id, zodat React-keys niet drijven bij dismiss.
type NoticeEntry = AcceptedNotice & { _id: number };

export interface ClusterSuggestionsPanelProps {
  projectId: string;
  topics: { id: string; title: string }[];
  ungroupedOpenCount: number;
  /**
   * "open"  → cluster ungrouped open issues (triage/backlog/todo/in_progress)
   * "done"  → cluster ungrouped afgeronde issues, voor retroactief opruimen
   * Default "open".
   */
  mode?: "open" | "done";
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
  mode = "open",
}: ClusterSuggestionsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clusters, setClusters] = useState<Cluster[] | null>(null);
  const [droppedExpired, setDroppedExpired] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Geaccepteerde clusters → korte succes-banners boven de lijst zodat de
  // gebruiker ziet wát er net is aangemaakt of gekoppeld. Volgorde nieuwste
  // bovenaan. Persistent tot de gebruiker dismissed of het paneel sluit.
  const [notices, setNotices] = useState<NoticeEntry[]>([]);
  const [isPending, startTransition] = useTransition();

  // Sentinel-id voor lopende fetch — een mode-switch (of nieuwe fetch)
  // increment de teller, zodat een al draaiende oude call zijn resultaat niet
  // meer in state schrijft. Voorkomt dat open-mode-clusters per ongeluk onder
  // de "Afgerond"-tab verschijnen na switch.
  const fetchIdRef = useRef(0);
  // Counter voor notice-keys; topicId alléén is geen unieke sleutel als
  // dezelfde existing-topic twee keer geaccepteerd wordt.
  const noticeCounterRef = useRef(0);

  const fetchClusters = useCallback(() => {
    const myId = ++fetchIdRef.current;
    startTransition(async () => {
      setError(null);
      const result: BulkClusterRunResult = await runBulkClusterCleanupAction({ projectId, mode });
      // Stale-result guard: tussen de await heeft een mode-switch of nieuwe
      // fetch onze id ge-overrulet — gooi het resultaat weg.
      if (myId !== fetchIdRef.current) return;
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setClusters(result.clusters);
      setDroppedExpired(result.droppedExpired);
    });
  }, [projectId, mode]);

  const removeCluster = useCallback((index: number) => {
    setClusters((prev) => {
      if (!prev) return prev;
      const next = prev.slice();
      next.splice(index, 1);
      return next;
    });
  }, []);

  const handleAccepted = useCallback(
    (index: number, notice: AcceptedNotice) => {
      const _id = ++noticeCounterRef.current;
      setNotices((prev) => [{ ...notice, _id }, ...prev]);
      removeCluster(index);
    },
    [removeCluster],
  );

  const dismissNotice = useCallback((idx: number) => {
    setNotices((prev) => {
      const next = prev.slice();
      next.splice(idx, 1);
      return next;
    });
  }, []);

  const close = useCallback(() => {
    setClusters(null);
    setDroppedExpired(0);
    setError(null);
    setNotices([]);
  }, []);

  // Mode-switch via aparte URL-param `?cleanupMode=done|open`. Ontkoppelt
  // tool-modus van status-filter zodat een eigen mixed status-filter
  // (`?status=done,backlog`) de tab-state niet stuk maakt. De page leest
  // `cleanupMode` en geeft 'm door als prop. Bij switch invalideren we ook
  // lopende fetch-resultaten via fetchIdRef — anders schrijft de oude call
  // alsnog de oude clusters in state na de switch.
  const switchMode = useCallback(
    (next: "open" | "done") => {
      if (next === mode) return;
      const params = new URLSearchParams(searchParams.toString());
      if (next === "done") {
        params.set("cleanupMode", "done");
      } else {
        params.delete("cleanupMode");
      }
      params.delete("page");
      fetchIdRef.current++;
      setClusters(null);
      setDroppedExpired(0);
      setError(null);
      setNotices([]);
      router.push(`/issues?${params.toString()}`);
    },
    [mode, router, searchParams],
  );

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
        <div
          role="tablist"
          aria-label="Welke issues clusteren"
          className="inline-flex rounded-md border border-border bg-background p-0.5 text-sm"
        >
          {(["open", "done"] as const).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => switchMode(m)}
                disabled={isPending}
                className={cn(
                  "rounded px-3 py-1 font-medium transition-colors disabled:opacity-50",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {m === "open" ? "Open" : "Afgerond"}
              </button>
            );
          })}
        </div>
        <span className="text-sm text-muted-foreground">
          {ungroupedOpenCount} ungrouped issue{ungroupedOpenCount === 1 ? "" : "s"}
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

      {notices.length > 0 && (
        <ul className="mt-3 grid gap-2" aria-live="polite">
          {notices.map((notice, idx) => (
            <li
              key={notice._id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30"
            >
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden />
              <span className="text-foreground">
                {notice.kind === "new" ? (
                  <>
                    Nieuw topic <strong className="font-semibold">{notice.topicTitle}</strong>{" "}
                    aangemaakt — {notice.linked} issue{notice.linked === 1 ? "" : "s"} gekoppeld.
                  </>
                ) : (
                  <>
                    {notice.linked} issue{notice.linked === 1 ? "" : "s"} gekoppeld aan{" "}
                    <strong className="font-semibold">{notice.topicTitle}</strong>.
                  </>
                )}
              </span>
              <Link
                href={`/topics/${notice.topicId}?project=${projectId}`}
                className="ml-auto inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-background px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
              >
                <ExternalLink className="size-3" aria-hidden />
                Bekijk topic
              </Link>
              <button
                type="button"
                onClick={() => dismissNotice(idx)}
                aria-label="Melding sluiten"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-emerald-100 hover:text-foreground dark:hover:bg-emerald-950"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

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
                    onAccepted={(notice) => handleAccepted(index, notice)}
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

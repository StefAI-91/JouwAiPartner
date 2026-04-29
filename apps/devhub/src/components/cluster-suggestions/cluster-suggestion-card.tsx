"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Layers, Loader2, Plus, RotateCcw, X } from "lucide-react";
import {
  acceptClusterAsNewAction,
  acceptClusterToExistingAction,
} from "@/actions/bulk-cluster-cleanup";
import type { BulkCluster } from "@repo/ai/validations/bulk-cluster-cleanup";
import { cn } from "@repo/ui/utils";

export interface ClusterSuggestionCardProps {
  cluster: BulkCluster;
  projectId: string;
  /** Titel van het bestaande topic bij `kind: "match"`. Null als verdwenen. */
  matchTitle: string | null;
  onAccepted: () => void;
  onIgnored: () => void;
}

/**
 * Eén cluster-card. Twee varianten:
 *  - match: TopicPill-stijl badge met titel van het bestaande topic
 *  - new:   "Nieuw topic" badge + voorgestelde titel + type
 *
 * Issue-chips openen de issue-detail in een nieuwe tab (target=_blank) zodat
 * het paneel zijn state niet verliest. Accept-actions hergebruiken de
 * bestaande `linkIssueAction` / `createTopicAction` één-op-één.
 */
export function ClusterSuggestionCard({
  cluster,
  projectId,
  matchTitle,
  onAccepted,
  onIgnored,
}: ClusterSuggestionCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Issues die de gebruiker handmatig uit dit cluster heeft gehaald voordat
  // hij accepteert. Lokaal — niet-persistent (PR-RULE-101).
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => new Set());

  const includedIds = useMemo(
    () => cluster.issue_ids.filter((id) => !excludedIds.has(id)),
    [cluster.issue_ids, excludedIds],
  );
  const allExcluded = includedIds.length === 0;

  const toggleExcluded = (id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const accept = () => {
    if (allExcluded) return;
    startTransition(async () => {
      setError(null);
      if (cluster.kind === "match") {
        const result = await acceptClusterToExistingAction({
          topicId: cluster.match_topic_id,
          issueIds: includedIds,
        });
        if ("error" in result) {
          setError(result.error);
          return;
        }
      } else {
        const result = await acceptClusterAsNewAction({
          projectId,
          topicPayload: cluster.new_topic,
          issueIds: includedIds,
        });
        if ("error" in result) {
          setError(result.error);
          return;
        }
      }
      onAccepted();
    });
  };

  return (
    <article
      className={cn(
        "rounded-md border border-border px-4 py-3",
        // Match-cluster = toevoegen aan bestaand topic → lichte groene tint
        // zodat in een lijst direct zichtbaar is welke cards iets bestaands
        // aanvullen vs. een nieuw topic voorstellen.
        cluster.kind === "match" ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-background",
        isPending && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        {cluster.kind === "match" ? (
          <span
            className={cn(
              "inline-flex max-w-[24rem] items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-medium",
              matchTitle
                ? "border-border bg-muted/40 text-foreground"
                : "border-destructive/30 bg-destructive/5 text-destructive",
            )}
          >
            <Layers className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{matchTitle ? `→ ${matchTitle}` : "Topic verdwenen"}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-primary/40 bg-primary/5 px-2.5 py-1 text-sm font-medium text-primary">
            <Plus className="size-4 shrink-0" aria-hidden />
            Nieuw topic ({cluster.new_topic.type}): {cluster.new_topic.title}
          </span>
        )}
        <span className="text-sm text-muted-foreground">
          {includedIds.length} van {cluster.issue_ids.length} issue
          {cluster.issue_ids.length === 1 ? "" : "s"}
        </span>
      </div>

      {cluster.kind === "new" && (
        <p className="mt-2 text-sm text-muted-foreground">{cluster.new_topic.description}</p>
      )}

      <p className="mt-2 text-sm italic text-muted-foreground">{cluster.rationale}</p>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {cluster.issue_ids.map((id) => {
          const isExcluded = excludedIds.has(id);
          return (
            <li
              key={id}
              className={cn(
                "inline-flex items-stretch overflow-hidden rounded-md border",
                isExcluded
                  ? "border-dashed border-border bg-muted/20"
                  : "border-border bg-muted/40",
              )}
            >
              <Link
                href={`/issues/${id}?project=${projectId}`}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "inline-flex items-center px-2 py-1 font-mono text-xs transition-colors hover:bg-muted",
                  isExcluded
                    ? "text-muted-foreground/60 line-through"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {id.slice(0, 8)}
              </Link>
              <button
                type="button"
                onClick={() => toggleExcluded(id)}
                disabled={isPending}
                aria-label={isExcluded ? "Issue weer toevoegen" : "Issue uit cluster halen"}
                title={isExcluded ? "Issue weer toevoegen" : "Issue uit cluster halen"}
                className={cn(
                  "inline-flex items-center border-l px-1.5 transition-colors disabled:opacity-50",
                  isExcluded
                    ? "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    : "border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                )}
              >
                {isExcluded ? (
                  <RotateCcw className="size-3" aria-hidden />
                ) : (
                  <X className="size-3" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {error && <p className="mt-2.5 text-sm text-destructive">{error}</p>}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={accept}
          disabled={isPending || allExcluded || (cluster.kind === "match" && !matchTitle)}
          title={allExcluded ? "Geen issues over om te accepteren" : undefined}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Check className="size-4" aria-hidden />
          )}
          Accepteer
        </button>
        <button
          type="button"
          onClick={onIgnored}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <X className="size-4" aria-hidden />
          Negeer
        </button>
      </div>
    </article>
  );
}

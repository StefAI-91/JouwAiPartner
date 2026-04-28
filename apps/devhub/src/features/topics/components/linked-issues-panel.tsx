"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { LinkedIssueRow } from "@repo/database/queries/topics";
import {
  linkIssueAction,
  searchProjectIssuesAction,
  unlinkIssueAction,
  type IssuePickerRow,
} from "../actions/linking";

interface LinkedIssuesPanelProps {
  topicId: string;
  projectId: string;
  initialLinked: LinkedIssueRow[];
}

/**
 * Linked-issues panel met (a) lijst van gekoppelde issues + unlink-knop,
 * en (b) een search-picker voor andere issues in hetzelfde project.
 *
 * De picker doet een debounced server-action call. We tonen geen
 * pagination — `/issues` is daarvoor de plek; de picker is een hulp om
 * snel te koppelen, niet de volledige lijst.
 */
export function LinkedIssuesPanel({ topicId, projectId, initialLinked }: LinkedIssuesPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IssuePickerRow[]>([]);
  const [searching, setSearching] = useState(false);

  const linkedIds = new Set(initialLinked.map((i) => i.id));

  // Debounced search: 250ms na laatste typebewerking één call.
  useEffect(() => {
    let cancelled = false;
    const trimmed = query.trim();
    if (trimmed.length === 0 && results.length === 0) return;

    const handle = setTimeout(async () => {
      setSearching(true);
      const result = await searchProjectIssuesAction({
        project_id: projectId,
        q: trimmed.length > 0 ? trimmed : undefined,
      });
      if (cancelled) return;
      setSearching(false);
      if ("error" in result) {
        setError(result.error);
        setResults([]);
        return;
      }
      setError(null);
      setResults(result.data.filter((r) => !linkedIds.has(r.id)));
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // We re-querien bij elke wijziging in `query`. linkedIds verandert pas
    // na een `router.refresh()` (eslint-disable-next-line react-hooks/exhaustive-deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, projectId]);

  function onLink(issueId: string) {
    startTransition(async () => {
      setError(null);
      const result = await linkIssueAction({ topic_id: topicId, issue_id: issueId });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
      setResults((prev) => prev.filter((r) => r.id !== issueId));
    });
  }

  function onUnlink(issueId: string) {
    startTransition(async () => {
      setError(null);
      const result = await unlinkIssueAction({ topic_id: topicId, issue_id: issueId });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border p-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">Gekoppelde issues</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{initialLinked.length}</span>
      </header>

      {initialLinked.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nog geen issues gekoppeld. Zoek hieronder om er een te koppelen.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {initialLinked.map((issue) => (
            <li key={issue.id} className="flex items-center gap-3 py-2">
              <Link
                href={`/issues/${issue.id}`}
                className="min-w-0 flex-1 truncate text-sm text-foreground hover:underline"
              >
                {issue.title}
              </Link>
              <span className="text-xs text-muted-foreground">{issue.status}</span>
              <button
                type="button"
                onClick={() => onUnlink(issue.id)}
                disabled={isPending}
                aria-label={`Ontkoppel issue ${issue.title}`}
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Issue zoeken om te koppelen</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Titel, beschrijving of #nummer"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </label>

        {searching ? (
          <p className="text-xs text-muted-foreground">Zoeken…</p>
        ) : results.length > 0 ? (
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {results.map((issue) => (
              <li
                key={issue.id}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
              >
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                  #{issue.issue_number}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{issue.title}</span>
                <span className="text-xs text-muted-foreground">{issue.status}</span>
                <button
                  type="button"
                  onClick={() => onLink(issue.id)}
                  disabled={isPending}
                  className="inline-flex h-7 items-center rounded-md border border-border bg-background px-2 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
                >
                  Koppel
                </button>
              </li>
            ))}
          </ul>
        ) : query.trim().length > 0 ? (
          <p className="text-xs text-muted-foreground">Geen issues gevonden.</p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}

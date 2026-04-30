"use client";

/**
 * Tiny pub/sub store for sidebar issue counts.
 *
 * Why this exists: the sidebar is in the root layout and needs counts per
 * project. Fetching them fresh on every navigation shows a visible lag
 * ("numbers popping in a second after the page renders"). This store:
 *
 *   1. Caches the last-known counts per projectId in module scope so a
 *      repeat visit to a project renders badges instantly while a background
 *      refresh keeps them accurate (stale-while-revalidate).
 *   2. Lets mutations elsewhere in the app dispatch optimistic deltas
 *      (e.g. move an issue from "triage" to "backlog" → sidebar updates
 *      before the server even responds).
 *
 * This is deliberately tiny — no Zustand/Redux needed for a six-key map.
 */

import { getIssueCountsAction } from "@/features/issues/actions/issues";

export type StatusKey = "triage" | "backlog" | "todo" | "in_progress" | "done" | "cancelled";
export type PriorityKey = "p1" | "p2" | "nice_to_have";
export type PriorityCounts = Partial<Record<PriorityKey, number>>;

export type StatusCounts = Partial<Record<StatusKey, number>> & {
  /** Sub-counts voor Te doen per prio. */
  todo_priority?: PriorityCounts;
  /** Sub-counts voor Backlog per prio. */
  backlog_priority?: PriorityCounts;
};

// Stable singleton for "no counts yet" so useSyncExternalStore sees the same
// reference between renders. Returning a fresh `{}` each call blows up
// React with "getSnapshot should be cached" (react-dev/errors/185) — the
// snapshot would look different every render and trigger an infinite loop.
export const EMPTY_COUNTS: StatusCounts = Object.freeze({}) as StatusCounts;

const cache = new Map<string, StatusCounts>();
const inFlight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const issueCountStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  get(projectId: string | null): StatusCounts {
    if (!projectId) return EMPTY_COUNTS;
    return cache.get(projectId) ?? EMPTY_COUNTS;
  },

  set(projectId: string, counts: StatusCounts) {
    cache.set(projectId, counts);
    emit();
  },

  /**
   * Fetch (or refresh) counts for a project. Dedupes concurrent requests per
   * projectId so mounting sidebar + issue page simultaneously only hits the
   * server once.
   */
  async refresh(projectId: string): Promise<void> {
    const existing = inFlight.get(projectId);
    if (existing) return existing;

    const promise = (async () => {
      try {
        const result = await getIssueCountsAction(projectId);
        if ("data" in result) {
          cache.set(projectId, result.data);
          emit();
        }
      } finally {
        inFlight.delete(projectId);
      }
    })();

    inFlight.set(projectId, promise);
    return promise;
  },

  /**
   * Optimistically move one issue between statuses. Used by the issue
   * detail view so the sidebar reflects a status change instantly.
   */
  bump(projectId: string, fromStatus: string | null, toStatus: string | null) {
    const current = { ...(cache.get(projectId) ?? {}) } as StatusCounts;
    if (fromStatus && isStatusKey(fromStatus)) {
      current[fromStatus] = Math.max(0, (current[fromStatus] ?? 0) - 1);
    }
    if (toStatus && isStatusKey(toStatus)) {
      current[toStatus] = (current[toStatus] ?? 0) + 1;
    }
    cache.set(projectId, current);
    emit();
  },
};

function isStatusKey(s: string): s is StatusKey {
  return (
    s === "triage" ||
    s === "backlog" ||
    s === "todo" ||
    s === "in_progress" ||
    s === "done" ||
    s === "cancelled"
  );
}

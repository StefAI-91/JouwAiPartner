"use client";

import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@repo/ui/utils";
import {
  ISSUE_PRIORITIES,
  ISSUE_PRIORITY_LABELS,
  ISSUE_PRIORITY_SHORT_LABELS,
  ISSUE_STATUS_LABELS,
  type IssuePriority,
  type IssueStatus,
} from "@repo/database/constants/issues";
import { updateIssueAction } from "../actions/issues";
import { issueCountStore } from "@/components/layout/issue-count-store";

type TargetStatus = Extract<IssueStatus, "todo" | "backlog">;

const PRIORITY_TO_STATUS: Record<IssuePriority, TargetStatus> = {
  urgent: "todo",
  high: "todo",
  medium: "backlog",
  low: "backlog",
};

const PRIORITY_BUTTON_STYLE: Record<IssuePriority, { selected: string; idle: string }> = {
  urgent: {
    selected: "bg-red-50 text-red-700 border-red-300 ring-2 ring-red-500",
    idle: "border-border bg-card text-muted-foreground hover:bg-muted",
  },
  high: {
    selected: "bg-orange-50 text-orange-700 border-orange-300 ring-2 ring-orange-500",
    idle: "border-border bg-card text-muted-foreground hover:bg-muted",
  },
  medium: {
    selected: "bg-yellow-50 text-yellow-700 border-yellow-300 ring-2 ring-yellow-500",
    idle: "border-border bg-card text-muted-foreground hover:bg-muted",
  },
  low: {
    selected: "bg-slate-100 text-slate-700 border-slate-300 ring-2 ring-slate-400",
    idle: "border-border bg-card text-muted-foreground hover:bg-muted",
  },
};

interface TriagePrioBarProps {
  issueId: string;
  projectId: string;
  currentStatus: string;
}

export function TriagePrioBar({ issueId, projectId, currentStatus }: TriagePrioBarProps) {
  const [selected, setSelected] = useState<IssuePriority | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const targetStatus = selected ? PRIORITY_TO_STATUS[selected] : null;

  function handleConfirm() {
    if (!selected || !targetStatus) return;
    setError(null);

    startTransition(async () => {
      issueCountStore.bump(projectId, currentStatus, targetStatus);

      const result = await updateIssueAction({
        id: issueId,
        priority: selected,
        status: targetStatus,
      });

      if ("error" in result) {
        issueCountStore.bump(projectId, targetStatus, currentStatus);
        setError(result.error);
        return;
      }

      issueCountStore.refresh(projectId);
    });
  }

  return (
    <section className="mb-6 rounded-lg border-2 border-primary/40 bg-primary/5 p-4">
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Kies prioriteit
          </label>
          <div className="flex flex-wrap gap-2">
            {ISSUE_PRIORITIES.map((p) => {
              const style = PRIORITY_BUTTON_STYLE[p];
              const isSelected = p === selected;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelected(p)}
                  disabled={isPending}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition-all disabled:opacity-50",
                    isSelected ? style.selected : style.idle,
                  )}
                >
                  <span className="font-mono font-bold">{ISSUE_PRIORITY_SHORT_LABELS[p]}</span>
                  <span className="ml-1.5 hidden text-xs sm:inline">
                    {ISSUE_PRIORITY_LABELS[p].split(" — ")[1]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={cn(
            "rounded-md border px-3 py-2 text-sm transition-colors",
            targetStatus
              ? "border-blue-200 bg-blue-50 text-blue-900"
              : "border-dashed border-border bg-muted/30 text-muted-foreground",
          )}
        >
          {targetStatus ? (
            <>
              <ArrowRight className="mr-1 inline size-3.5" />
              <strong>{ISSUE_PRIORITY_SHORT_LABELS[selected!]} gekozen</strong> → status wordt
              automatisch{" "}
              <strong className="text-blue-700">
                &ldquo;{ISSUE_STATUS_LABELS[targetStatus]}&rdquo;
              </strong>
            </>
          ) : (
            <>Kies eerst een prioriteit. Status volgt automatisch.</>
          )}
          <p className="mt-1 text-xs opacity-80">
            P0/P1 → Te doen · P2/P3 → Backlog · later wijzigen kan via de sidebar
          </p>
        </div>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-primary/20 pt-3">
          <p className="text-xs text-muted-foreground">
            Prio gekozen? Bevestig om uit triage te halen.
          </p>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected || isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Bezig..." : "Bevestig"}
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

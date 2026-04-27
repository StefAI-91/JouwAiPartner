"use client";

import type { GoldenMeetingState } from "@repo/database/queries/golden";

interface Props {
  state: GoldenMeetingState | null;
  itemCount: number;
  isPending: boolean;
  onConfirmZero: () => void;
  onOpenSkip: () => void;
  onReset: () => void;
}

export function CoderStatusPanel({
  state,
  itemCount,
  isPending,
  onConfirmZero,
  onOpenSkip,
  onReset,
}: Props) {
  const isCoded = state?.status === "coded";
  const isSkipped = state?.status === "skipped";

  return (
    <section className="rounded-xl border border-border/60 bg-card p-4">
      <h2 className="text-sm font-semibold">Status</h2>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
        {isCoded && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-900">
            coded · {itemCount} items
          </span>
        )}
        {isSkipped && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
            skipped
          </span>
        )}
        {!state && (
          <span className="rounded-full border border-border/60 bg-muted px-2 py-0.5 font-medium text-muted-foreground">
            ungecodeerd
          </span>
        )}
      </div>
      {isSkipped && state?.notes && (
        <p className="mt-2 text-[11.5px] italic text-muted-foreground">Skip-reden: {state.notes}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {!isCoded && itemCount === 0 && (
          <button
            type="button"
            onClick={onConfirmZero}
            disabled={isPending}
            className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-[11.5px] hover:bg-muted disabled:opacity-50"
          >
            Bevestig: 0 items
          </button>
        )}
        <button
          type="button"
          onClick={onOpenSkip}
          disabled={isPending}
          className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-[11.5px] hover:bg-muted disabled:opacity-50"
        >
          Skip met reden
        </button>
        {state && (
          <button
            type="button"
            onClick={onReset}
            disabled={isPending}
            className="rounded-md border border-destructive/40 bg-background px-3 py-1.5 text-[11.5px] text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            Reset
          </button>
        )}
      </div>
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { pmReviewAction } from "../actions/pm-review";

/**
 * Decline-modal. Min 10 chars op de reason — vision §5: een lege of een-
 * woord-reason naar de klant is geen verklaring. Submit-knop disabled tot
 * minimum gehaald is.
 *
 * Geen rich-edit; v1 = plain text.
 */
export function DeclineModal({
  issueId,
  onClose,
  onError,
}: {
  issueId: string;
  onClose: () => void;
  onError?: (msg: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);

  const isValid = reason.trim().length >= 10;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLocalError(null);
    startTransition(async () => {
      const res = await pmReviewAction({
        action: "decline",
        issueId,
        declineReason: reason.trim(),
      });
      if ("error" in res) {
        setLocalError(res.error);
        onError?.(res.error);
        return;
      }
      onClose();
    });
  };

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Decline reden"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-background p-6 ring-1 ring-foreground/[0.08]"
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
            Decline naar klant
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <p className="mb-3 text-[12.5px] leading-relaxed text-muted-foreground">
          De klant ziet deze reden bij hun melding. Wees concreet — &ldquo;scope-creep&rdquo;,
          &ldquo;duplicate van #123&rdquo;, &ldquo;niet realiseerbaar binnen budget&rdquo;.
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="scope-creep · duplicate · niet realiseerbaar"
          className="w-full rounded-md border border-border bg-background p-3 text-[13px] leading-relaxed text-foreground outline-none ring-1 ring-foreground/[0.04] focus:ring-foreground/[0.18]"
        />
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground/70">
          <span>{reason.length}/1000 · minimum 10</span>
          {localError ? <span className="text-destructive">{localError}</span> : null}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-[12px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={!isValid || isPending}
            className="rounded-md bg-destructive px-3 py-1.5 text-[12px] font-medium text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50"
          >
            {isPending ? "Bezig…" : "Decline"}
          </button>
        </div>
      </form>
    </div>
  );
}

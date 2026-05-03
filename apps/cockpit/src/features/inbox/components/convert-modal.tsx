"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { pmReviewAction } from "../actions/pm-review";

/**
 * Convert-modal: zet een feedback-issue om naar een klant-vraag. Min 10
 * chars op de verheldering — anders heeft de klant niets om op te
 * antwoorden. Rich-edit + due-date + topic-link komen in CC-005.
 */
export function ConvertModal({
  issueId,
  onClose,
  onError,
}: {
  issueId: string;
  onClose: () => void;
  onError?: (msg: string) => void;
}) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);

  const isValid = body.trim().length >= 10;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLocalError(null);
    startTransition(async () => {
      const res = await pmReviewAction({
        action: "convert",
        issueId,
        questionBody: body.trim(),
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
      aria-label="Omzetten naar bericht"
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
            Omzetten naar bericht
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
          Stuur een verheldering of vervolg aan de klant. De feedback wordt afgesloten met een link
          naar het nieuwe bericht.
        </p>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="Bijvoorbeeld: 'Kun je beschrijven welke stap precies misgaat? Zit je in stap 1, 2, of 3?'"
          className="w-full rounded-md border border-border bg-background p-3 text-[13px] leading-relaxed text-foreground outline-none ring-1 ring-foreground/[0.04] focus:ring-foreground/[0.18]"
        />
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground/70">
          <span>{body.length}/2000 · minimum 10</span>
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
            className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Bezig…" : "Omzetten"}
          </button>
        </div>
      </form>
    </div>
  );
}

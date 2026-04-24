"use client";

import { useState, useTransition } from "react";
import { Popover } from "@base-ui/react/popover";
import { CircleOff } from "lucide-react";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/utils";
import { REJECTION_REASONS, type RejectionReason } from "@/features/themes/validations";
import { rejectThemeMatchAction } from "@/features/themes/actions";

const REASON_LABELS: Record<RejectionReason, { title: string; hint: string }> = {
  niet_substantieel: {
    title: "Niet substantieel",
    hint: "AI zag iets waar geen inhoudelijk gesprek aan vastzat.",
  },
  ander_thema: {
    title: "Ander thema",
    hint: "Het onderwerp was wel relevant, maar dit thema klopt niet.",
  },
  te_breed: {
    title: "Te breed",
    hint: "De match is te generiek of er zit geen afgebakend verhaal achter.",
  },
};

export interface MatchRejectPopoverProps {
  meetingId: string;
  themeId: string;
  themeName: string;
  /** Optioneel: called nadat de match is afgewezen — voor local UI-refresh. */
  onRejected?: () => void;
}

/**
 * UI-297/298/299 — ⊘-icon naast een theme-link. Klik → popover met 3 radio's
 * (niet_substantieel / ander_thema / te_breed) + bevestig-knop. Submit roept
 * `rejectThemeMatchAction` aan, die de match verwijdert en een row in
 * `theme_match_rejections` schrijft voor de feedback-loop.
 *
 * Idempotent (EDGE-211): dubbele click op een reeds verwijderde match
 * retourneert success zonder dubbele rejection-row. De popover toont dan
 * een tevreden indicator en sluit.
 */
export function MatchRejectPopover({
  meetingId,
  themeId,
  themeName,
  onRejected,
}: MatchRejectPopoverProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<RejectionReason | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!reason) return;
    setError(null);
    startTransition(async () => {
      const result = await rejectThemeMatchAction({ meetingId, themeId, reason });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setReason(null);
      onRejected?.();
    });
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setReason(null);
          setError(null);
        }
      }}
    >
      <Popover.Trigger
        type="button"
        aria-label={`Deze match afwijzen: ${themeName}`}
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/60 transition-colors",
          "hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
        )}
      >
        <CircleOff className="h-3.5 w-3.5" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6}>
          <Popover.Popup
            className={cn(
              "z-50 w-80 rounded-xl border border-border bg-card p-4 shadow-lg",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
              "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            <div className="space-y-3">
              <div>
                <div className="text-[13px] font-semibold text-foreground">Match afwijzen</div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Geef aan waarom deze koppeling niet klopt. De reden gaat als{" "}
                  <em>negative example</em> mee in de volgende ThemeTagger-prompt.
                </p>
              </div>
              <fieldset className="space-y-1.5">
                <legend className="sr-only">Reden van afwijzen</legend>
                {REJECTION_REASONS.map((r) => {
                  const label = REASON_LABELS[r];
                  const isSelected = reason === r;
                  return (
                    <label
                      key={r}
                      className={cn(
                        "flex cursor-pointer gap-2 rounded-md border border-border/60 px-3 py-2 text-[12.5px]",
                        "hover:border-primary/40",
                        isSelected && "border-primary/60 bg-primary/5",
                      )}
                    >
                      <input
                        type="radio"
                        name={`reject-reason-${themeId}`}
                        value={r}
                        checked={isSelected}
                        onChange={() => setReason(r)}
                        className="mt-0.5 accent-primary"
                      />
                      <span>
                        <span className="block font-medium text-foreground">{label.title}</span>
                        <span className="text-[11px] text-muted-foreground">{label.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
              {error && (
                <div className="rounded-md bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive">
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Popover.Close
                  render={
                    <Button type="button" variant="outline" size="sm" disabled={isPending}>
                      Annuleren
                    </Button>
                  }
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={submit}
                  disabled={!reason || isPending}
                >
                  {isPending ? "Afwijzen..." : "Match afwijzen"}
                </Button>
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

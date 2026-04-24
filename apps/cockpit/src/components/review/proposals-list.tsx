"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@repo/ui/badge";
import { confirmThemeProposalAction, rejectThemeProposalAction } from "@/features/themes/actions";

export interface ProposalItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
  matching_guide: string;
  status: "emerging" | "verified" | "archived";
}

interface Props {
  meetingId: string;
  proposals: ProposalItem[];
}

/**
 * TH-011 (UI-330) — Review van voorgestelde thema's ingesneden op de
 * origin-meeting. Reviewer kan confirmeren (status → verified) of
 * afwijzen (status → archived + meeting_themes link cleanup). Lichtgewicht
 * kaart met inline acties; de bulk-review via `/review` kan nog steeds
 * dezelfde proposals edit'en (bv. emoji of matching_guide aanpassen
 * vóór goedkeuren) — dit tabblad is de quick-confirm path.
 */
export function ProposalsList({ meetingId, proposals }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyThemeId, setBusyThemeId] = useState<string | null>(null);

  const onConfirm = (themeId: string) => {
    setError(null);
    setBusyThemeId(themeId);
    startTransition(async () => {
      const res = await confirmThemeProposalAction({ themeId, meetingId });
      setBusyThemeId(null);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  const onReject = (themeId: string) => {
    setError(null);
    setBusyThemeId(themeId);
    startTransition(async () => {
      const res = await rejectThemeProposalAction({ themeId, meetingId });
      setBusyThemeId(null);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  if (proposals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Geen voorgestelde thema&apos;s voor deze meeting.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {proposals.map((p) => {
        const busy = isPending && busyThemeId === p.id;
        return (
          <article key={p.id} className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{p.emoji}</span>
                  <h3 className="text-sm font-semibold">{p.name}</h3>
                  <Badge variant="secondary" className="text-[10px]">
                    emerging
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => onReject(p.id)}
                  disabled={busy || isPending}
                  className="rounded-md border border-border/60 px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                >
                  {busy ? "…" : "Afwijzen"}
                </button>
                <button
                  type="button"
                  onClick={() => onConfirm(p.id)}
                  disabled={busy || isPending}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {busy ? "…" : "Bevestigen"}
                </button>
              </div>
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:underline">
                Matching guide
              </summary>
              <p className="mt-1 whitespace-pre-wrap text-[12px] text-muted-foreground">
                {p.matching_guide}
              </p>
            </details>
          </article>
        );
      })}
    </div>
  );
}

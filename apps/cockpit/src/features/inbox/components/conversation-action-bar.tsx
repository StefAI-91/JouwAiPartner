"use client";

import { useState, useTransition } from "react";
import { pmReviewAction } from "../actions/pm-review";
import { DeclineModal } from "./decline-modal";
import { ConvertModal } from "./convert-modal";

/**
 * Action-bar boven de thread. Alleen renderen voor feedback in
 * `needs_pm_review`; andere statussen tonen de bar niet (vision §5 "acties
 * scheiden van leeswerk", maar als er niets te doen is, geen bar).
 */
export function ConversationActionBar({ issueId }: { issueId: string }) {
  const [declineOpen, setDeclineOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onAction = (action: "endorse" | "defer") => {
    setError(null);
    startTransition(async () => {
      const res = await pmReviewAction({ action, issueId });
      if ("error" in res) setError(res.error);
    });
  };

  return (
    <>
      <div className="flex items-center gap-1.5 border-b border-border/40 bg-gradient-to-b from-background to-muted/20 px-6 py-2.5">
        <span className="mr-2 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground/80 uppercase">
          Acties
        </span>
        <ActionPill tone="primary" onClick={() => onAction("endorse")} disabled={isPending}>
          Endorse → DevHub
        </ActionPill>
        <ActionPill tone="destructive" onClick={() => setDeclineOpen(true)} disabled={isPending}>
          Decline
        </ActionPill>
        <ActionPill tone="muted" onClick={() => onAction("defer")} disabled={isPending}>
          Defer
        </ActionPill>
        <ActionPill tone="muted" onClick={() => setConvertOpen(true)} disabled={isPending}>
          Convert naar bericht
        </ActionPill>
        {error ? <span className="ml-auto text-[11px] text-destructive">{error}</span> : null}
      </div>
      {declineOpen ? (
        <DeclineModal issueId={issueId} onClose={() => setDeclineOpen(false)} onError={setError} />
      ) : null}
      {convertOpen ? (
        <ConvertModal issueId={issueId} onClose={() => setConvertOpen(false)} onError={setError} />
      ) : null}
    </>
  );
}

function ActionPill({
  children,
  tone,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  tone: "primary" | "destructive" | "muted";
  onClick: () => void;
  disabled?: boolean;
}) {
  const cls =
    tone === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/30"
      : tone === "destructive"
        ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
        : "bg-foreground/[0.04] text-foreground/80 hover:bg-foreground/[0.08]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition active:translate-y-px disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}

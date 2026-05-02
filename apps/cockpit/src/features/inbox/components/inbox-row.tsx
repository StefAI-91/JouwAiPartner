"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, X, Clock, MessageSquarePlus } from "lucide-react";
import type { InboxItem } from "@repo/database/queries/inbox";
import { pmReviewAction } from "../actions/pm-review";
import { SourceDot } from "./source-dot";
import { DeclineModal } from "./decline-modal";
import { ConvertModal } from "./convert-modal";

/**
 * Linear-stijl rij. Status-bullet links → avatar → sender+project →
 * subject/snippet → source-dot → timestamp (fade-out on hover) → hover-actions.
 *
 * Klik buiten de hover-actions navigeert naar de detail-route. Binnen de
 * hover-actions: 4 PM-acties bij needs_pm_review, 1 (open detail) bij andere.
 */

export function InboxRow({ item, currentTime }: { item: InboxItem; currentTime: number }) {
  const [declineOpen, setDeclineOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isFeedback = item.kind === "feedback";
  const status = isFeedback ? item.issue.status : item.thread.status;
  const isWaitingOnMe = isFeedback && status === "needs_pm_review";
  const isOpenQuestion = !isFeedback && status === "open";

  const sender = isFeedback
    ? {
        name: item.issue.reporter_name ?? "Klant",
        initial: (item.issue.reporter_name ?? "K").charAt(0).toUpperCase(),
        role: "client" as const,
      }
    : {
        name: "Klant",
        initial: "K",
        role: "client" as const,
      };

  const titleLine = isFeedback
    ? (item.issue.client_title ?? item.issue.title)
    : item.thread.body.slice(0, 90);

  const snippet = isFeedback
    ? (item.issue.client_description ?? item.issue.description ?? "")
    : (item.thread.replies[item.thread.replies.length - 1]?.body ?? "");

  const detailHref = `/inbox/${item.kind}/${item.id}`;

  const onAction = (action: "endorse" | "defer") => {
    setError(null);
    startTransition(async () => {
      const res = await pmReviewAction({ action, issueId: item.id });
      if ("error" in res) setError(res.error);
    });
  };

  const isUnread = item.isUnread;
  const ts = formatTimestamp(item.activityAt, currentTime);

  return (
    <li className="group/row relative flex items-center gap-3 border-b border-border/20 px-6 py-2.5 transition hover:bg-muted/30">
      <Link href={detailHref} className="absolute inset-0 z-0" aria-label="Open conversation" />

      <span
        className={`mt-0.5 h-2 w-2 shrink-0 rounded-full relative z-[1] ${
          isWaitingOnMe || isOpenQuestion
            ? "bg-primary ring-2 ring-primary/20"
            : "border border-foreground/30"
        }`}
        aria-hidden
      />

      <Avatar role={sender.role} initial={sender.initial} />

      <div className="relative z-[1] flex w-40 shrink-0 flex-col leading-tight">
        <span
          className={`truncate text-[12px] ${
            isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/85"
          }`}
        >
          {sender.name}
        </span>
        <span className="truncate text-[10px] text-muted-foreground/70">
          {isFeedback ? item.issue.project_id.slice(0, 8) : item.thread.project_id.slice(0, 8)}
        </span>
      </div>

      <div className="relative z-[1] min-w-0 flex-1">
        <p
          className={`truncate text-[12.5px] ${
            isUnread ? "font-medium text-foreground" : "text-foreground/85"
          }`}
        >
          {titleLine}
          {snippet ? (
            <span className="ml-2 font-normal text-muted-foreground/70">— {snippet}</span>
          ) : null}
        </p>
        {error ? <span className="text-[10px] text-destructive">{error}</span> : null}
      </div>

      {isFeedback ? <SourceDot source={item.issue.source} /> : null}

      <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground/60 transition group-hover/row:opacity-0">
        {ts}
      </span>

      <div className="pointer-events-none absolute right-4 z-[2] flex items-center gap-0.5 opacity-0 transition group-hover/row:pointer-events-auto group-hover/row:opacity-100">
        {isWaitingOnMe ? (
          <>
            <IconBtn
              label="Endorse"
              tone="primary"
              onClick={() => onAction("endorse")}
              disabled={isPending}
            >
              <Check className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn label="Decline" onClick={() => setDeclineOpen(true)} disabled={isPending}>
              <X className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn label="Defer" onClick={() => onAction("defer")} disabled={isPending}>
              <Clock className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn label="Convert" onClick={() => setConvertOpen(true)} disabled={isPending}>
              <MessageSquarePlus className="h-3.5 w-3.5" />
            </IconBtn>
          </>
        ) : (
          <Link
            href={detailHref}
            title="Open"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-background text-foreground/70 ring-1 ring-foreground/[0.08] transition hover:bg-muted hover:text-foreground active:translate-y-px"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {declineOpen && isFeedback ? (
        <DeclineModal issueId={item.id} onClose={() => setDeclineOpen(false)} onError={setError} />
      ) : null}
      {convertOpen && isFeedback ? (
        <ConvertModal issueId={item.id} onClose={() => setConvertOpen(false)} onError={setError} />
      ) : null}
    </li>
  );
}

function Avatar({ role, initial }: { role: "team" | "client"; initial: string }) {
  const cls =
    role === "team"
      ? "bg-primary/10 text-primary ring-primary/20"
      : "bg-[oklch(0.55_0.12_280)]/10 text-[oklch(0.55_0.12_280)] ring-[oklch(0.55_0.12_280)]/20";
  return (
    <span
      className={`relative z-[1] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium ring-1 ${cls}`}
    >
      {initial}
    </span>
  );
}

function IconBtn({
  children,
  label,
  tone,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  tone?: "primary";
  onClick: () => void;
  disabled?: boolean;
}) {
  const cls =
    tone === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "bg-background text-foreground/70 ring-1 ring-foreground/[0.08] hover:bg-muted hover:text-foreground";
  return (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition active:translate-y-px disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}

// Compact relatieve timestamp: "2u" / "3d" / "15 mei". Niet exact, niet
// belangrijk voor UX — de time-group-header doet het precieze werk.
function formatTimestamp(iso: string, now: number): string {
  const t = new Date(iso).getTime();
  const diffMs = now - t;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${Math.max(1, diffMin)}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}u`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  const d = new Date(iso);
  return `${d.getDate()} ${["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"][d.getMonth()]}`;
}

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, X, Clock, MessageSquarePlus, ChevronRight } from "lucide-react";
import type { InboxItem } from "@repo/database/queries/inbox";
import { resolvePortalSourceGroup } from "@repo/database/constants/issues";
import { SourceIndicator, type SourceGroup } from "@repo/ui/source-indicator";
import { pmReviewAction } from "../actions/pm-review";
import { DeclineModal } from "./decline-modal";
import { ConvertModal } from "./convert-modal";

/**
 * Linear-stijl rij. Lead met project naam (meest onderscheidende info; "Klant"
 * was niet onderscheidend genoeg — elke regel was identiek). Klant-rol staat
 * als compacte pill ernaast. Bold weight is de hoofd-unread-cue (status-dot
 * blijft als secondary signal voor items die op PM wachten). Chevron rechts
 * geeft permanente tap-affordance — belangrijk op mobile waar geen hover is.
 *
 * Klik buiten de hover-actions navigeert naar de detail-route. Hover-actions:
 * 4 PM-acties bij needs_pm_review, anders is de chevron de open-actie.
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
  const needsAttentionDot = isWaitingOnMe || isOpenQuestion;

  const reporterName = isFeedback ? item.issue.reporter_name : null;
  const projectName =
    item.project.name ??
    `Project ${(isFeedback ? item.issue.project_id : item.thread.project_id).slice(0, 8)}`;
  const initial = (reporterName ?? projectName).charAt(0).toUpperCase();

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
    <li className="group/row relative flex items-center gap-3 border-b border-border/20 px-4 py-2.5 transition hover:bg-muted/30 sm:px-6">
      <Link href={detailHref} className="absolute inset-0 z-0" aria-label="Open conversation" />

      <span
        className={`relative z-[1] mt-0.5 h-2 w-2 shrink-0 rounded-full ${
          needsAttentionDot ? "bg-primary ring-2 ring-primary/20" : "bg-transparent"
        }`}
        aria-hidden
      />

      <Avatar initial={initial} />

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`truncate text-[12.5px] ${
              isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/85"
            }`}
          >
            {projectName}
          </span>
          <span className="shrink-0 rounded-full bg-foreground/[0.06] px-1.5 py-px text-[9.5px] font-medium tracking-wide text-foreground/55 uppercase">
            {reporterName ?? "Klant"}
          </span>
        </div>
        <p
          className={`truncate text-[12.5px] ${
            isUnread ? "font-medium text-foreground" : "text-foreground/70"
          }`}
        >
          {titleLine}
          {snippet ? (
            <span className="ml-1.5 font-normal text-muted-foreground/70">— {snippet}</span>
          ) : null}
        </p>
        {error ? <span className="text-[10px] text-destructive">{error}</span> : null}
      </div>

      {isFeedback ? (
        <SourceIndicator group={portalGroupAsIndicator(item.issue.source)} variant="dot" />
      ) : null}

      <div className="relative z-[1] flex shrink-0 items-center gap-1">
        <span
          className={`text-[11px] tabular-nums transition group-hover/row:opacity-0 ${
            isUnread ? "text-foreground/70" : "text-muted-foreground/60"
          }`}
        >
          {ts}
        </span>
        <ChevronRight
          className="h-3.5 w-3.5 text-foreground/25 transition group-hover/row:opacity-0"
          aria-hidden
        />
      </div>

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

function Avatar({ initial }: { initial: string }) {
  return (
    <span className="relative z-[1] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[oklch(0.55_0.12_280)]/10 text-[10px] font-medium text-[oklch(0.55_0.12_280)] ring-1 ring-[oklch(0.55_0.12_280)]/20">
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

// `resolvePortalSourceGroup` retourneert ook `"jaip"` voor interne meldingen;
// SourceIndicator toont alleen klant/gebruiker. CC-008 — mapt 'jaip' → null
// zodat de oude SourceDot-fallback (geen render bij intern) behouden blijft.
function portalGroupAsIndicator(source: string | null | undefined): SourceGroup | null {
  const group = resolvePortalSourceGroup(source);
  return group === "jaip" ? null : group;
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

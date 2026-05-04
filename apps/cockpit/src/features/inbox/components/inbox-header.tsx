"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Inbox, Plus } from "lucide-react";
import type { AccessibleProject } from "@repo/database/queries/projects/access";
import { ComposeModal } from "./compose-modal";

/**
 * Page header met filter-chips. Filter via URL-param `?filter=` zodat de
 * server-component (page.tsx) de gefilterde lijst kan renderen — geen
 * client-side filtering, geen hydration-mismatch.
 *
 * Default = `wacht_op_mij`. Chips zijn `<Link>`s zodat ze SSR-bookmark-baar
 * blijven. CC-006 voegt de "+ Nieuw bericht"-knop toe die de compose-modal
 * opent.
 */

export type InboxFilter = "wacht_op_mij" | "wacht_op_klant" | "geparkeerd";

export const INBOX_FILTERS: InboxFilter[] = ["wacht_op_mij", "wacht_op_klant", "geparkeerd"];

export function InboxHeader({
  counts,
  projects,
  initialProjectId,
}: {
  counts: { pmReview: number; openQuestions: number; respondedQuestions: number; deferred: number };
  projects: AccessibleProject[];
  initialProjectId?: string;
}) {
  const params = useSearchParams();
  const active = (params.get("filter") as InboxFilter | null) ?? "wacht_op_mij";
  const [composeOpen, setComposeOpen] = useState(false);

  // "Wacht op mij" = needs_pm_review issues + responded client_questions (klant
  // antwoordde, team moet acteren). "Wacht op klant" = open client_questions.
  const waitingOnMe = counts.pmReview + counts.respondedQuestions;
  const total = waitingOnMe + counts.openQuestions + counts.deferred;
  const canCompose = projects.length > 0;

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b border-border/40 px-6 py-4">
        <div className="flex items-center gap-3">
          <Inbox className="h-4 w-4 text-foreground/60" />
          <h1 className="text-[15px] font-semibold tracking-tight text-foreground">Inbox</h1>
          <span className="rounded-full bg-foreground/[0.06] px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-foreground/70">
            {total}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          disabled={!canCompose}
          title={
            canCompose ? "Start een vrij bericht aan een klant" : "Geen toegankelijke projecten"
          }
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition hover:bg-foreground/90 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Nieuw bericht
        </button>
      </header>
      <div className="flex items-center gap-1.5 border-b border-border/40 bg-muted/20 px-6 py-2">
        <Chip
          label="Wacht op mij"
          count={waitingOnMe}
          filter="wacht_op_mij"
          active={active === "wacht_op_mij"}
        />
        <Chip
          label="Wacht op klant"
          count={counts.openQuestions}
          filter="wacht_op_klant"
          active={active === "wacht_op_klant"}
        />
        <Chip
          label="Geparkeerd"
          count={counts.deferred}
          filter="geparkeerd"
          active={active === "geparkeerd"}
        />
      </div>

      {composeOpen ? (
        <ComposeModal
          projects={projects}
          initialProjectId={initialProjectId}
          onClose={() => setComposeOpen(false)}
        />
      ) : null}
    </>
  );
}

function Chip({
  label,
  count,
  filter,
  active,
}: {
  label: string;
  count: number;
  filter: InboxFilter;
  active: boolean;
}) {
  // Subtiele active-state (lichte fill + ring) i.p.v. zwart-op-zwart met de
  // "Nieuw bericht"-CTA — die blijft het enige donkere element op de page.
  const href = `/inbox?filter=${filter}`;
  const cls = active
    ? "bg-foreground/[0.06] text-foreground ring-1 ring-foreground/[0.08]"
    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground";
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition ${cls}`}
      aria-current={active ? "page" : undefined}
    >
      {label}
      <span className={`tabular-nums ${active ? "text-foreground/55" : "text-foreground/40"}`}>
        {count}
      </span>
    </Link>
  );
}

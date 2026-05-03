import Link from "next/link";
import { ArrowUpRight, MessageCircle, PenLine } from "lucide-react";
import type { ClientQuestionListRow } from "@repo/database/queries/client-questions";
import { cn } from "@repo/ui/utils";
import { PortalInboxRow } from "./portal-inbox-row";

/**
 * Lijst-pane voor de portal-inbox. Server component.
 *
 * Sticky-bovenste rij is de prominente "Nieuw bericht aan team"-CTA in
 * primary-kleur — dit is de kern-actie van de inbox en mag het ook tonen.
 * Daaronder filter-tabs (Alles · Wacht op team · Beantwoord) gestuurd via
 * een URL-searchParam zodat de page-fetch leidend blijft. Daaronder een
 * datum-gegroepeerde lijst (Vandaag · Gisteren · Eerder).
 *
 * Counts in de tabs worden uit `questions` afgeleid — dat is de complete
 * (ongefilterde) set die de page ophaalt. Wisselen tussen tabs vereist dus
 * geen extra DB-call: we filteren in geheugen voor display.
 */
export type InboxFilter = "all" | "open" | "responded";

export interface PortalInboxListProps {
  projectId: string;
  questions: ClientQuestionListRow[];
  selectedId: string | undefined;
  currentProfileId: string;
  filter: InboxFilter;
}

export function PortalInboxList({
  projectId,
  questions,
  selectedId,
  currentProfileId,
  filter,
}: PortalInboxListProps) {
  const counts = countByStatus(questions, currentProfileId);
  const visible = filterQuestions(questions, currentProfileId, filter);
  const groups = groupByDate(visible);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Compose-CTA — primary surface, eigen ruimte */}
      <div className="border-b border-border/60 px-4 py-3">
        <Link
          href={`/projects/${projectId}/inbox/new`}
          prefetch
          className={cn(
            "group flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 transition",
            selectedId === "new"
              ? "bg-primary/10 text-primary ring-1 ring-primary/20"
              : "bg-primary text-primary-foreground shadow-soft-sm hover:brightness-110",
          )}
        >
          <span className="flex items-center gap-2.5">
            <PenLine className="size-3.5" strokeWidth={2.25} />
            <span className="text-[13px] font-semibold">Nieuw bericht aan team</span>
          </span>
          <ArrowUpRight className="size-4 opacity-70 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Filter-tabs */}
      {questions.length > 0 ? (
        <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-2.5">
          <FilterTab projectId={projectId} value="all" active={filter === "all"} count={counts.all}>
            Alles
          </FilterTab>
          <FilterTab
            projectId={projectId}
            value="open"
            active={filter === "open"}
            count={counts.open}
            tone={counts.open > 0 ? "amber" : undefined}
          >
            Wacht op team
          </FilterTab>
          <FilterTab
            projectId={projectId}
            value="responded"
            active={filter === "responded"}
            count={counts.responded}
          >
            Beantwoord
          </FilterTab>
        </div>
      ) : null}

      {questions.length === 0 ? (
        <EmptyState />
      ) : visible.length === 0 ? (
        <EmptyFilteredState filter={filter} />
      ) : (
        <ul className="flex-1 overflow-y-auto pb-4">
          {groups.map((g) => (
            <DateGroup key={g.label} label={g.label} first={g === groups[0]}>
              {g.items.map((q) => (
                <PortalInboxRow
                  key={q.id}
                  projectId={projectId}
                  question={q}
                  currentProfileId={currentProfileId}
                  isActive={q.id === selectedId}
                />
              ))}
            </DateGroup>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterTab({
  projectId,
  value,
  active,
  count,
  tone,
  children,
}: {
  projectId: string;
  value: InboxFilter;
  active: boolean;
  count: number;
  tone?: "amber";
  children: React.ReactNode;
}) {
  const href =
    value === "all"
      ? `/projects/${projectId}/inbox`
      : `/projects/${projectId}/inbox?status=${value}`;
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition",
        active
          ? "bg-foreground text-background"
          : "border border-border/60 bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      <span>{children}</span>
      <span
        className={cn(
          "grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9.5px] font-bold tabular-nums",
          active
            ? "bg-background/20 text-background"
            : tone === "amber"
              ? "bg-amber-500/15 text-amber-700"
              : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </Link>
  );
}

function DateGroup({
  label,
  first,
  children,
}: {
  label: string;
  first: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <div className={cn("flex items-center gap-3 px-5", first ? "pb-2 pt-3" : "pb-2 pt-4")}>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
          {label}
        </span>
        <span className="h-px flex-1 bg-border/60" />
      </div>
      <ul>{children}</ul>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-12 text-center">
      <div>
        <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-muted">
          <MessageCircle className="size-4 text-muted-foreground" strokeWidth={1.75} />
        </div>
        <p className="text-[13px] font-medium text-foreground">Nog geen berichten</p>
        <p className="mx-auto mt-1 max-w-[28ch] text-[11.5px] text-muted-foreground">
          Start zelf een gesprek of wacht op een bericht van het team.
        </p>
      </div>
    </div>
  );
}

function EmptyFilteredState({ filter }: { filter: InboxFilter }) {
  const labels: Record<InboxFilter, string> = {
    all: "Niets te tonen.",
    open: "Niets dat nog op een antwoord wacht.",
    responded: "Nog geen beantwoorde berichten.",
  };
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-12 text-center">
      <p className="text-[12px] text-muted-foreground">{labels[filter]}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Pure helpers — eenvoudig testbaar zonder DOM.
   ──────────────────────────────────────────────────────────────── */

function countByStatus(
  questions: ClientQuestionListRow[],
  currentProfileId: string,
): { all: number; open: number; responded: number } {
  let open = 0;
  let responded = 0;
  for (const q of questions) {
    // Tab "Wacht op team" = open thread waarvan de root van de klant zelf is.
    // Threads die door het team zijn gestart en nog open staan, wachten juist
    // op de klant — die horen niet in "wacht op team".
    if (q.status === "open" && q.sender_profile_id === currentProfileId) open += 1;
    else if (q.status === "responded") responded += 1;
  }
  return { all: questions.length, open, responded };
}

function filterQuestions(
  questions: ClientQuestionListRow[],
  currentProfileId: string,
  filter: InboxFilter,
): ClientQuestionListRow[] {
  if (filter === "all") return questions;
  if (filter === "responded") return questions.filter((q) => q.status === "responded");
  // open = wacht op team
  return questions.filter((q) => q.status === "open" && q.sender_profile_id === currentProfileId);
}

function groupByDate(
  questions: ClientQuestionListRow[],
): Array<{ label: string; items: ClientQuestionListRow[] }> {
  const today = startOfDay(new Date());
  const yesterday = startOfDay(new Date(today.getTime() - 24 * 60 * 60 * 1000));
  const weekAgo = startOfDay(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));

  const buckets: Record<string, ClientQuestionListRow[]> = {
    Vandaag: [],
    Gisteren: [],
    "Deze week": [],
    Eerder: [],
  };

  for (const q of questions) {
    const t = new Date(q.created_at).getTime();
    if (t >= today.getTime()) buckets.Vandaag.push(q);
    else if (t >= yesterday.getTime()) buckets.Gisteren.push(q);
    else if (t >= weekAgo.getTime()) buckets["Deze week"].push(q);
    else buckets.Eerder.push(q);
  }

  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

import { Plus, Inbox, Filter, Check, X, Clock, MessageSquarePlus } from "lucide-react";
import { COCKPIT_SECTIONS, type CockpitItem } from "./mock-data";

/**
 * Cockpit-inbox in Linear-stijl: dichte rij-stijl, filter-chips i.p.v. secties,
 * hover-actions, time-grouping. Default rust; acties verschijnen on-hover.
 */
export function CockpitInboxLinear() {
  // Flatten alle items in één lijst voor time-grouping
  const allItems = COCKPIT_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({ ...item, section: section.key })),
  );

  const today = allItems.filter(
    (i) => i.createdAt === "2u" || i.createdAt === "3u" || i.createdAt === "6u",
  );
  const earlier = allItems.filter((i) => !today.includes(i));

  return (
    <div className="flex h-[860px] flex-col overflow-hidden">
      <PageHeader />
      <FilterStrip />
      <div className="flex-1 overflow-y-auto">
        <TimeGroup label="Vandaag" count={today.length}>
          {today.map((item) => (
            <RowItem key={item.id} item={item} />
          ))}
        </TimeGroup>
        <TimeGroup label="Eerder deze week" count={earlier.length}>
          {earlier.map((item) => (
            <RowItem key={item.id} item={item} />
          ))}
        </TimeGroup>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border/40 px-6 py-4">
      <div className="flex items-center gap-3">
        <Inbox className="h-4 w-4 text-foreground/60" />
        <h1 className="text-[15px] font-semibold tracking-tight text-foreground">Inbox</h1>
        <span className="rounded-full bg-foreground/[0.06] px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-foreground/70">
          5
        </span>
      </div>
      <button className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition hover:bg-foreground/90">
        <Plus className="h-3.5 w-3.5" />
        Nieuw bericht
      </button>
    </header>
  );
}

function FilterStrip() {
  return (
    <div className="flex items-center gap-1.5 border-b border-border/40 bg-muted/20 px-6 py-2">
      <Chip label="Wacht op mij" count={3} active />
      <Chip label="Wacht op klant" count={1} />
      <Chip label="Geparkeerd" count={1} />
      <span className="mx-2 h-4 w-px bg-border" />
      <button className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-muted/40 hover:text-foreground">
        <Filter className="h-3 w-3" />
        Project
      </button>
    </div>
  );
}

function Chip({ label, count, active }: { label: string; count: number; active?: boolean }) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      }`}
    >
      {label}
      <span className={`tabular-nums ${active ? "text-background/70" : "text-foreground/40"}`}>
        {count}
      </span>
    </button>
  );
}

function TimeGroup({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section>
      <div className="sticky top-0 z-10 flex items-baseline gap-3 border-b border-border/30 bg-background/95 px-6 py-2 backdrop-blur-sm">
        <span className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/80 uppercase">
          {label}
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground/50">{count}</span>
      </div>
      <ul>{children}</ul>
    </section>
  );
}

function RowItem({ item }: { item: CockpitItem & { section: string } }) {
  const isWaitingOnMe = item.section === "wacht_op_jou";

  return (
    <li className="group/row relative flex items-center gap-3 border-b border-border/20 px-6 py-2.5 transition hover:bg-muted/30">
      {/* Status indicator: solid for "wait on me", open for others */}
      <span
        className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
          isWaitingOnMe ? "bg-primary ring-2 ring-primary/20" : "border border-foreground/30"
        }`}
        aria-hidden
      />

      {/* Avatar */}
      <Avatar role={item.sender.role} initial={item.sender.initial} />

      {/* Sender + project (compact column) */}
      <div className="flex w-40 shrink-0 flex-col leading-tight">
        <span
          className={`truncate text-[12px] ${isWaitingOnMe ? "font-semibold text-foreground" : "font-medium text-foreground/85"}`}
        >
          {item.sender.name}
        </span>
        <span className="truncate text-[10px] text-muted-foreground/70">{item.project.client}</span>
      </div>

      {/* Subject + snippet (flex column) */}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[12.5px] ${isWaitingOnMe ? "font-medium text-foreground" : "text-foreground/85"}`}
        >
          {item.title ?? item.body.slice(0, 90)}
          {item.title ? (
            <span className="ml-2 font-normal text-muted-foreground/70">— {item.body}</span>
          ) : null}
        </p>
      </div>

      {/* Source badge — only if applicable */}
      {item.sourceBadge ? <SourceDot kind={item.sourceBadge} /> : null}

      {/* Timestamp — fades out on hover */}
      <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground/60 transition group-hover/row:opacity-0">
        {item.createdAt}
      </span>

      {/* Hover actions — slide in from right */}
      <div className="pointer-events-none absolute right-4 flex items-center gap-0.5 opacity-0 transition group-hover/row:pointer-events-auto group-hover/row:opacity-100">
        {isWaitingOnMe ? (
          <>
            <IconBtn label="Endorse" tone="primary">
              <Check className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn label="Decline">
              <X className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn label="Defer">
              <Clock className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn label="Convert">
              <MessageSquarePlus className="h-3.5 w-3.5" />
            </IconBtn>
          </>
        ) : (
          <IconBtn label="Open">
            <MessageSquarePlus className="h-3.5 w-3.5" />
          </IconBtn>
        )}
      </div>
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
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium ring-1 ${cls}`}
    >
      {initial}
    </span>
  );
}

function SourceDot({ kind }: { kind: "client_pm" | "end_user" }) {
  const cls = kind === "client_pm" ? "bg-[oklch(0.55_0.12_280)]" : "bg-warning/80";
  const label = kind === "client_pm" ? "Klant-PM" : "Eindgebr.";
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground/70"
      title={kind === "client_pm" ? "Klant-PM" : "Eindgebruiker"}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cls}`} />
      <span className="hidden xl:inline">{label}</span>
    </span>
  );
}

function IconBtn({
  children,
  label,
  tone,
}: {
  children: React.ReactNode;
  label: string;
  tone?: "primary";
}) {
  const cls =
    tone === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "bg-background text-foreground/70 ring-1 ring-foreground/[0.08] hover:bg-muted hover:text-foreground";
  return (
    <button
      title={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition active:translate-y-px ${cls}`}
    >
      {children}
    </button>
  );
}

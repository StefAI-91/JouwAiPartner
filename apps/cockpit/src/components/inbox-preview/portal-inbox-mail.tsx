import { Plus, Bell } from "lucide-react";
import { PORTAL_ITEMS, type PortalItem, type MockPortalStatus } from "./mock-data";

/**
 * Portal-inbox in Mail-stijl: email-app vertrouwd patroon. Avatar + sender +
 * subject + snippet + status-pill rechts. Bold = ongelezen, regular = gelezen.
 */
export function PortalInboxMail() {
  return (
    <div className="flex h-[860px] flex-col overflow-hidden bg-[oklch(0.985_0.005_75)]">
      <PortalHeader />
      <NavStrip />
      <ListHeader />
      <div className="flex-1 overflow-y-auto">
        {PORTAL_ITEMS.map((item, i) => (
          <MailRow key={item.id} item={item} unread={i < 2} />
        ))}
      </div>
    </div>
  );
}

function PortalHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border/40 bg-background px-6 py-3">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <span className="font-serif-display text-sm font-bold">A</span>
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] tracking-[0.14em] text-muted-foreground/70 uppercase">
            Acme Corp
          </span>
          <span className="text-[12.5px] font-medium text-foreground">Marieke van der Berg</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted">
          <Bell className="h-4 w-4" />
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition hover:bg-foreground/90">
          <Plus className="h-3.5 w-3.5" />
          Nieuw bericht
        </button>
      </div>
    </header>
  );
}

function NavStrip() {
  return (
    <nav className="flex gap-1 border-b border-border/40 bg-background/40 px-6 py-1">
      <NavTab label="Briefing" />
      <NavTab label="Roadmap" />
      <NavTab label="Berichten" active count={2} />
      <NavTab label="Meetings" />
      <NavTab label="Feedback" />
    </nav>
  );
}

function NavTab({ label, active, count }: { label: string; active?: boolean; count?: number }) {
  return (
    <span
      className={`relative inline-flex items-center gap-1.5 px-3 py-2.5 text-[12px] transition ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
      }`}
    >
      {label}
      {count ? (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[9px] font-semibold text-primary tabular-nums">
          {count}
        </span>
      ) : null}
      {active ? (
        <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" aria-hidden />
      ) : null}
    </span>
  );
}

function ListHeader() {
  return (
    <div className="flex items-baseline justify-between border-b border-border/40 bg-background/60 px-6 py-2">
      <span className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/80 uppercase">
        Berichten
      </span>
      <span className="text-[10px] tabular-nums text-muted-foreground/60">
        2 ongelezen · 5 totaal
      </span>
    </div>
  );
}

const STATUS_STYLES: Record<MockPortalStatus, { label: string; cls: string }> = {
  ontvangen: {
    label: "Ontvangen",
    cls: "bg-foreground/[0.04] text-foreground/70 ring-foreground/[0.08]",
  },
  in_behandeling: {
    label: "In behandeling",
    cls: "bg-primary/[0.08] text-primary ring-primary/20",
  },
  afgerond: {
    label: "Afgerond",
    cls: "bg-success/[0.10] text-success-foreground ring-success/20",
  },
  geparkeerd: {
    label: "Later",
    cls: "bg-warning/[0.10] text-warning-foreground ring-warning/25",
  },
  vervolgvraag: {
    label: "Vraag",
    cls: "bg-[oklch(0.55_0.12_280)]/[0.08] text-[oklch(0.45_0.12_280)] ring-[oklch(0.55_0.12_280)]/25",
  },
};

function MailRow({ item, unread }: { item: PortalItem; unread: boolean }) {
  const fromTeam = item.kind === "team_message";
  const sender = fromTeam ? (item.fromTeam?.name ?? "Team") : "Acme Corp";
  const initial = fromTeam ? (item.fromTeam?.initial ?? "T") : "A";
  const subject = fromTeam ? "Bericht van team" : (item.title ?? "—");
  const status = STATUS_STYLES[item.status];

  return (
    <article
      className={`group/row flex items-center gap-3 border-b border-border/30 px-6 py-3 transition hover:bg-muted/20 ${
        unread ? "bg-background" : "bg-background/40"
      }`}
    >
      {/* Unread indicator: small primary dot (left of avatar) */}
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${unread ? "bg-primary" : "bg-transparent"}`}
        aria-hidden
      />

      {/* Avatar */}
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-medium ring-1 ${
          fromTeam
            ? "bg-primary/10 text-primary ring-primary/20"
            : "bg-foreground/[0.04] text-foreground/70 ring-foreground/[0.08]"
        }`}
      >
        {initial}
      </span>

      {/* Sender + subject column */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className={`truncate text-[12.5px] ${unread ? "font-semibold text-foreground" : "font-medium text-foreground/85"}`}
          >
            {sender}
          </span>
          {fromTeam ? (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 text-[9px] font-medium text-primary">
              Team
            </span>
          ) : null}
        </div>
        <p
          className={`mt-0.5 truncate text-[12px] ${unread ? "text-foreground/85" : "text-muted-foreground"}`}
        >
          <span className={unread ? "font-medium" : ""}>{subject}</span>
          <span className="ml-1.5 text-muted-foreground/70">— {item.body}</span>
        </p>
      </div>

      {/* Status pill */}
      {!fromTeam ? (
        <span
          className={`hidden shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset md:inline-flex ${status.cls}`}
        >
          {status.label}
        </span>
      ) : null}

      {/* Time */}
      <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground/60">
        {item.createdAt}
      </span>
    </article>
  );
}

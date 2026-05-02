import { Plus, Bell, MessageSquare, ChevronRight } from "lucide-react";
import { PORTAL_ITEMS, type PortalItem, type MockPortalStatus } from "./mock-data";

/**
 * Portal-inbox mock — visualiseert wat de klant ziet (CC-001 status-mapping,
 * CC-005 onboarding, CC-006 vrije bericht-flow, CC-002 mail-deeplink-target).
 */
export function PortalInboxMock() {
  return (
    <div className="flex h-[860px] flex-col overflow-hidden bg-[oklch(0.985_0.005_75)]">
      <PortalHeader />
      <ProjectStrip />
      <OnboardingCard />
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-10">
        <h2 className="mb-3 px-1 text-[11px] font-semibold tracking-[0.18em] text-foreground/70 uppercase">
          Berichten
        </h2>
        <div className="space-y-2.5">
          {PORTAL_ITEMS.map((item) => (
            <PortalCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PortalHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border/40 bg-background/80 px-6 py-4 backdrop-blur-sm">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <span className="font-serif-display text-sm font-bold">A</span>
        </span>
        <div>
          <p className="text-[10px] tracking-[0.16em] text-muted-foreground/70 uppercase">
            Acme Corp · klantportaal
          </p>
          <p className="text-[13px] font-medium text-foreground">Marieke van der Berg</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted">
          <Bell className="h-4 w-4" />
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition hover:bg-foreground/90">
          <Plus className="h-3.5 w-3.5" />
          Nieuw bericht aan team
        </button>
      </div>
    </header>
  );
}

function ProjectStrip() {
  return (
    <nav className="flex gap-1 border-b border-border/40 bg-background/40 px-6 py-1">
      <NavTab label="Briefing" />
      <NavTab label="Roadmap" />
      <NavTab label="Berichten" active count={5} />
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

function OnboardingCard() {
  return (
    <div className="mx-6 mt-4 mb-2 overflow-hidden rounded-xl bg-gradient-to-br from-primary/[0.07] to-[oklch(0.7_0.15_70)]/[0.05] ring-1 ring-primary/[0.15]">
      <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <h3 className="font-serif-display text-lg leading-tight text-foreground">
            Welkom in je inbox
          </h3>
          <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
              Hier komen al je vragen en updates van het Jouw AI Partner team.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
              Je krijgt een mail wanneer er iets nieuws is — je hoeft hier niet te wachten.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
              Antwoord direct in een bericht; we zien het meteen aan onze kant.
            </li>
          </ul>
        </div>
        <button className="self-start rounded-md bg-foreground/[0.04] px-3 py-1.5 text-[11px] font-medium text-foreground/70 transition hover:bg-foreground/[0.08] sm:self-end">
          Begrepen, dank
        </button>
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<
  MockPortalStatus,
  { label: string; dot: string; bg: string; ring: string }
> = {
  ontvangen: {
    label: "Ontvangen",
    dot: "bg-foreground/40",
    bg: "bg-foreground/[0.04]",
    ring: "ring-foreground/[0.08]",
  },
  in_behandeling: {
    label: "In behandeling",
    dot: "bg-primary",
    bg: "bg-primary/[0.06]",
    ring: "ring-primary/20",
  },
  afgerond: {
    label: "Afgerond",
    dot: "bg-success",
    bg: "bg-success/[0.08]",
    ring: "ring-success/25",
  },
  geparkeerd: {
    label: "Geparkeerd",
    dot: "bg-warning/80",
    bg: "bg-warning/[0.08]",
    ring: "ring-warning/25",
  },
  vervolgvraag: {
    label: "We hebben een vraag",
    dot: "bg-[oklch(0.55_0.12_280)]",
    bg: "bg-[oklch(0.55_0.12_280)]/[0.06]",
    ring: "ring-[oklch(0.55_0.12_280)]/25",
  },
};

function PortalCard({ item }: { item: PortalItem }) {
  if (item.kind === "team_message") return <TeamMessageCard item={item} />;
  return <FeedbackCard item={item} />;
}

function FeedbackCard({ item }: { item: PortalItem }) {
  const style = STATUS_STYLES[item.status];
  return (
    <article className="group/portal-card overflow-hidden rounded-xl bg-background ring-1 ring-foreground/[0.06] transition hover:ring-foreground/[0.12]">
      <div className="flex gap-4 px-4 py-3.5">
        <span className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-medium text-foreground">{item.title}</p>
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/60">
              {item.createdAt} geleden
            </span>
          </div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground line-clamp-1">
            {item.body}
          </p>
          {item.declineReason ? (
            <div className="mt-2 rounded-md bg-success/[0.06] px-3 py-2 text-[11px] leading-relaxed text-foreground/80 ring-1 ring-success/15">
              <span className="font-medium text-success-foreground">Reactie van team:</span>{" "}
              {item.declineReason}
            </div>
          ) : null}
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${style.bg} ring-1 ring-inset ${style.ring}`}
            >
              <span className={`h-1 w-1 rounded-full ${style.dot}`} />
              {style.label}
            </span>
            <button className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 transition hover:text-foreground">
              Bekijk gesprek <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function TeamMessageCard({ item }: { item: PortalItem }) {
  return (
    <article className="overflow-hidden rounded-xl bg-gradient-to-br from-primary/[0.05] via-background to-background ring-1 ring-primary/[0.12]">
      <div className="flex gap-4 px-4 py-3.5">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/25">
          <span className="font-medium text-[13px]">{item.fromTeam?.initial}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-medium text-foreground">{item.fromTeam?.name}</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
                <MessageSquare className="h-2.5 w-2.5" /> Team
              </span>
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/60">
              {item.createdAt} geleden
            </span>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-foreground/85">{item.body}</p>
          <div className="mt-2 flex items-center gap-2">
            <button className="inline-flex items-center gap-1 rounded-md bg-foreground px-2.5 py-1 text-[11px] font-medium text-background transition hover:bg-foreground/90">
              Antwoord
            </button>
            <button className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-muted-foreground transition hover:text-foreground">
              Markeer als gelezen
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

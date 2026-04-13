"use client";

import {
  BookUser,
  BrainCircuit,
  Calendar,
  ClipboardCheck,
  FolderKanban,
  Home,
  Mail,
  ArrowUpRight,
  Check,
  type LucideIcon,
} from "lucide-react";
import {
  focusProjectsMvp,
  productionQuery,
  todaysSignals,
  notYet,
  type FocusProjectMvp,
  type HealthStatus,
} from "./mock-data";

type VariantKey = "lijst" | "kaart" | "rijk";

const variants: { key: VariantKey; label: string; tag: string; description: string }[] = [
  {
    key: "lijst",
    label: "A — Lijst",
    tag: "Compact",
    description:
      "Eén regel per project: health-dot + naam + actie-badge. Past naadloos onder de bestaande 'Projects'-link.",
  },
  {
    key: "kaart",
    label: "B — Kaart",
    tag: "Aanbevolen",
    description:
      "Twee regels: naam + feitelijke subline ('3 acties · meeting 2d'). Transparant — je ziet meteen waaróm iets hier staat.",
  },
  {
    key: "rijk",
    label: "C — Rijk",
    tag: "Informatief",
    description:
      "Drie regels waar data aanwezig is: organisatie, acties, meeting, deadline. Leeg waar niet — geen verzonnen invulling.",
  },
];

/* ────────────────────────────────────────────────────────────
   Primitieven
   ──────────────────────────────────────────────────────────── */

function HealthDot({ status }: { status: HealthStatus | null }) {
  const color =
    status === "rood"
      ? "bg-rose-500"
      : status === "oranje"
        ? "bg-amber-500"
        : status === "groen"
          ? "bg-emerald-500"
          : "bg-muted-foreground/30";
  return <span className={`relative inline-flex h-2 w-2 shrink-0 rounded-full ${color}`} />;
}

function HealthBar({ status }: { status: HealthStatus | null }) {
  const color =
    status === "rood"
      ? "bg-rose-500"
      : status === "oranje"
        ? "bg-amber-500"
        : status === "groen"
          ? "bg-emerald-500"
          : "bg-muted-foreground/25";
  return <span className={`h-full w-[3px] shrink-0 rounded-full ${color}`} />;
}

function NavRow({
  icon: Icon,
  label,
  active = false,
  badge,
  muted = false,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  badge?: number;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 ${muted ? "py-1.5" : "py-2"} text-sm font-medium ${
        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"
      }`}
    >
      <Icon className={`${muted ? "h-4 w-4" : "h-[18px] w-[18px]"} shrink-0`} />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
      {children}
    </div>
  );
}

/** Bouw een feitelijke subline alleen uit aanwezige data — nooit iets verzinnen */
function buildSubline(p: FocusProjectMvp): string {
  const parts: string[] = [];
  if (p.openActions > 0) {
    parts.push(`${p.openActions} ${p.openActions === 1 ? "actie" : "acties"}`);
  }
  if (p.lastMeetingRelative) parts.push(`meeting ${p.lastMeetingRelative}`);
  else if (p.openActions === 0) parts.push(`bijgewerkt ${p.updatedRelative}`);
  return parts.join(" · ");
}

/* ────────────────────────────────────────────────────────────
   Variant A — Lijst (één regel)
   ──────────────────────────────────────────────────────────── */

function VariantLijst({ focus }: { focus: FocusProjectMvp[] }) {
  return (
    <div className="flex h-full flex-col gap-0.5 p-3">
      <NavRow icon={Home} label="Home" />
      <NavRow icon={BrainCircuit} label="Intelligence" />
      <NavRow icon={ClipboardCheck} label="Review" badge={7} />
      <NavRow icon={FolderKanban} label="Projects" active />
      <NavRow icon={BookUser} label="Directory" />

      <SectionLabel>Focus</SectionLabel>
      {focus.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-foreground/80"
        >
          <HealthDot status={p.health} />
          <span className="flex-1 truncate">{p.name}</span>
          {p.openActions > 0 && (
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground/70">
              {p.openActions}
            </span>
          )}
        </div>
      ))}

      <SectionLabel>Bronnen</SectionLabel>
      <NavRow icon={Calendar} label="Meetings" muted />
      <NavRow icon={Mail} label="Emails" muted />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Variant B — Kaart (twee regels)
   ──────────────────────────────────────────────────────────── */

function VariantKaart({ focus }: { focus: FocusProjectMvp[] }) {
  return (
    <div className="flex h-full flex-col p-3">
      <NavRow icon={Home} label="Home" />
      <NavRow icon={BrainCircuit} label="Intelligence" />
      <NavRow icon={ClipboardCheck} label="Review" badge={7} />
      <NavRow icon={FolderKanban} label="Projects" active />
      <NavRow icon={BookUser} label="Directory" />

      <SectionLabel>Focus</SectionLabel>
      <div className="space-y-1">
        {focus.map((p) => (
          <div
            key={p.id}
            className="group flex gap-2.5 rounded-lg bg-white/40 p-2 transition-colors hover:bg-white"
          >
            <HealthBar status={p.health} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[13px] font-semibold text-foreground">{p.name}</span>
                {p.openActions > 0 && (
                  <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-foreground/85 px-1.5 text-[10px] font-bold tabular-nums text-background">
                    {p.openActions}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{buildSubline(p)}</p>
            </div>
          </div>
        ))}
      </div>

      <button className="mt-2 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium text-muted-foreground/70 hover:text-foreground">
        Alle projecten <ArrowUpRight className="h-3 w-3" />
      </button>

      <SectionLabel>Bronnen</SectionLabel>
      <NavRow icon={Calendar} label="Meetings" muted />
      <NavRow icon={Mail} label="Emails" muted />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Variant C — Rijk (drie regels waar data aanwezig is)
   ──────────────────────────────────────────────────────────── */

function VariantRijk({ focus }: { focus: FocusProjectMvp[] }) {
  return (
    <div className="flex h-full flex-col p-3">
      <NavRow icon={Home} label="Home" />
      <NavRow icon={BrainCircuit} label="Intelligence" />
      <NavRow icon={ClipboardCheck} label="Review" badge={7} />
      <NavRow icon={FolderKanban} label="Projects" active />
      <NavRow icon={BookUser} label="Directory" />

      <SectionLabel>Focus</SectionLabel>
      <div className="space-y-1.5">
        {focus.map((p) => (
          <div
            key={p.id}
            className="group flex gap-2.5 rounded-lg border border-border/40 bg-card/70 p-2.5"
          >
            <HealthBar status={p.health} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[13px] font-semibold text-foreground">{p.name}</span>
                {p.openActions > 0 && (
                  <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-foreground/85 px-1.5 text-[10px] font-bold tabular-nums text-background">
                    {p.openActions}
                  </span>
                )}
              </div>
              <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground/80">
                {p.organization}
                {p.owner && <span className="text-muted-foreground/50"> · {p.owner}</span>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-muted-foreground">
                {p.openActions > 0 && (
                  <span>
                    {p.openActions} {p.openActions === 1 ? "actie" : "acties"}
                  </span>
                )}
                {p.lastMeetingRelative && (
                  <>
                    {p.openActions > 0 && <span className="text-muted-foreground/30">·</span>}
                    <span>meeting {p.lastMeetingRelative}</span>
                  </>
                )}
                {p.deadlineRelative && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="font-medium text-amber-700">
                      deadline {p.deadlineRelative}
                    </span>
                  </>
                )}
                {!p.openActions && !p.lastMeetingRelative && !p.deadlineRelative && (
                  <span className="italic text-muted-foreground/50">
                    bijgewerkt {p.updatedRelative}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <SectionLabel>Bronnen</SectionLabel>
      <NavRow icon={Calendar} label="Meetings" muted />
      <NavRow icon={Mail} label="Emails" muted />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Sidebar device frame
   ──────────────────────────────────────────────────────────── */

function SidebarFrame({
  variant,
  label,
  tag,
  description,
  children,
  highlight = false,
}: {
  variant: VariantKey;
  label: string;
  tag: string;
  description: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h3 className="font-heading text-[15px] font-semibold text-foreground">{label}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              highlight ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground/80"
            }`}
          >
            {tag}
          </span>
        </div>
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl border bg-sidebar shadow-xl transition-all ${
          highlight ? "border-primary/30 shadow-primary/10" : "border-border/60"
        }`}
      >
        <div className="flex items-center gap-1.5 border-b border-border/40 bg-background/60 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
          <span className="ml-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
            cockpit · sidebar · {variant}
          </span>
        </div>

        <div className="h-[620px] w-full overflow-y-auto scrollbar-none">{children}</div>
      </div>

      <p className="mt-3 text-[12.5px] leading-[1.5] text-muted-foreground">{description}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   "Hoe werkt het" — signalen paneel
   ──────────────────────────────────────────────────────────── */

function SignalsPanel() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="border-b border-border/40 bg-gradient-to-br from-emerald-50 via-transparent to-transparent p-5">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-700">
          <Check className="h-3.5 w-3.5" />
          Vandaag al beschikbaar
        </div>
        <h3 className="font-heading mt-1 text-[18px] font-semibold">
          Alle signalen komen uit bestaande kolommen
        </h3>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Geen nieuwe tabellen. Geen AI-aanroepen. Geen schema-migraties.
        </p>
      </div>

      <div className="divide-y divide-border/40">
        {todaysSignals.map((s) => (
          <div key={s.label} className="flex items-start gap-3 px-5 py-3">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[13px] font-semibold text-foreground">{s.label}</span>
                <code className="font-mono text-[10.5px] text-muted-foreground">{s.source}</code>
              </div>
              <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                {s.usage}
                {"note" in s && s.note && (
                  <span className="italic text-muted-foreground/70"> — {s.note}</span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   SQL-preview
   ──────────────────────────────────────────────────────────── */

function QueryPanel() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-[#1a1f1a] text-emerald-50">
      <div className="flex items-center gap-2 border-b border-white/10 bg-black/30 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
        <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-white/50">
          listFocusProjects · Postgres
        </span>
      </div>
      <pre className="overflow-x-auto px-5 py-4 font-mono text-[11.5px] leading-[1.6]">
        <code>{productionQuery}</code>
      </pre>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Not yet — wat we expliciet overslaan
   ──────────────────────────────────────────────────────────── */

function NotYetPanel() {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 p-5">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <BrainCircuit className="h-3.5 w-3.5" />
        Bewust niet in deze MVP
      </div>
      <h3 className="font-heading mt-1 text-[18px] font-semibold">Voor later</h3>
      <ul className="mt-4 space-y-3">
        {notYet.map((item) => (
          <li key={item.label} className="flex gap-3">
            <span className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-md bg-muted px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              {item.phase}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold text-foreground">{item.label}</div>
              <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                {item.reason}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Main
   ──────────────────────────────────────────────────────────── */

export function NavigatiePlayground() {
  return (
    <div className="space-y-10">
      {/* Drie varianten */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SidebarFrame
          variant="lijst"
          label={variants[0].label}
          tag={variants[0].tag}
          description={variants[0].description}
        >
          <VariantLijst focus={focusProjectsMvp} />
        </SidebarFrame>

        <SidebarFrame
          variant="kaart"
          label={variants[1].label}
          tag={variants[1].tag}
          description={variants[1].description}
          highlight
        >
          <VariantKaart focus={focusProjectsMvp} />
        </SidebarFrame>

        <SidebarFrame
          variant="rijk"
          label={variants[2].label}
          tag={variants[2].tag}
          description={variants[2].description}
        >
          <VariantRijk focus={focusProjectsMvp} />
        </SidebarFrame>
      </div>

      {/* Signalen + Query */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SignalsPanel />
        <div className="flex flex-col gap-6">
          <QueryPanel />
          <NotYetPanel />
        </div>
      </div>
    </div>
  );
}

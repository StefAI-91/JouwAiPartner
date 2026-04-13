"use client";

import {
  BookUser,
  BrainCircuit,
  Calendar,
  ClipboardCheck,
  FolderKanban,
  Home,
  Mail,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  focusProjectsMvp,
  productionQuery,
  signals,
  parked,
  type FocusProjectMvp,
} from "./mock-data";

type VariantKey = "naam" | "twee-regels" | "inline";

const variants: { key: VariantKey; label: string; tag: string; description: string }[] = [
  {
    key: "naam",
    label: "A — Alleen naam",
    tag: "Minimaal",
    description:
      "Eén regel per project. Geen subline, geen badge, geen dot. Puur snelkoppeling — klik en je bent er.",
  },
  {
    key: "twee-regels",
    label: "B — Naam + organisatie",
    tag: "Aanbevolen",
    description:
      "Twee regels: projectnaam met muted organisatie eronder. Genoeg context om 'CAI Studio' en 'CAI v2' uit elkaar te houden.",
  },
  {
    key: "inline",
    label: "C — Inline",
    tag: "Compact",
    description:
      "Eén regel met organisatie naast de naam, muted. Dezelfde info als B maar spaarzamer met verticale ruimte.",
  },
];

/* ────────────────────────────────────────────────────────────
   Primitieven
   ──────────────────────────────────────────────────────────── */

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

/* ────────────────────────────────────────────────────────────
   Variant A — Alleen naam
   ──────────────────────────────────────────────────────────── */

function VariantNaam({ focus }: { focus: FocusProjectMvp[] }) {
  return (
    <div className="flex h-full flex-col gap-0.5 p-3">
      <NavRow icon={Home} label="Home" />
      <NavRow icon={BrainCircuit} label="Intelligence" />
      <NavRow icon={ClipboardCheck} label="Review" badge={7} />
      <NavRow icon={FolderKanban} label="Projects" active />
      <NavRow icon={BookUser} label="Directory" />

      <SectionLabel>Actieve projecten</SectionLabel>
      {focus.map((p) => (
        <div
          key={p.id}
          className="truncate rounded-lg px-3 py-1.5 text-[13px] font-medium text-foreground/80 hover:bg-muted/60"
        >
          {p.name}
        </div>
      ))}

      <SectionLabel>Bronnen</SectionLabel>
      <NavRow icon={Calendar} label="Meetings" muted />
      <NavRow icon={Mail} label="Emails" muted />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Variant B — Naam + organisatie op twee regels
   ──────────────────────────────────────────────────────────── */

function VariantTweeRegels({ focus }: { focus: FocusProjectMvp[] }) {
  return (
    <div className="flex h-full flex-col gap-0.5 p-3">
      <NavRow icon={Home} label="Home" />
      <NavRow icon={BrainCircuit} label="Intelligence" />
      <NavRow icon={ClipboardCheck} label="Review" badge={7} />
      <NavRow icon={FolderKanban} label="Projects" active />
      <NavRow icon={BookUser} label="Directory" />

      <SectionLabel>Actieve projecten</SectionLabel>
      {focus.map((p) => (
        <div key={p.id} className="rounded-lg px-3 py-1.5 hover:bg-muted/60">
          <div className="truncate text-[13px] font-medium text-foreground/85">{p.name}</div>
          <div className="truncate text-[10.5px] text-muted-foreground/70">{p.organization}</div>
        </div>
      ))}

      <SectionLabel>Bronnen</SectionLabel>
      <NavRow icon={Calendar} label="Meetings" muted />
      <NavRow icon={Mail} label="Emails" muted />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Variant C — Inline (naam · organisatie)
   ──────────────────────────────────────────────────────────── */

function VariantInline({ focus }: { focus: FocusProjectMvp[] }) {
  return (
    <div className="flex h-full flex-col gap-0.5 p-3">
      <NavRow icon={Home} label="Home" />
      <NavRow icon={BrainCircuit} label="Intelligence" />
      <NavRow icon={ClipboardCheck} label="Review" badge={7} />
      <NavRow icon={FolderKanban} label="Projects" active />
      <NavRow icon={BookUser} label="Directory" />

      <SectionLabel>Actieve projecten</SectionLabel>
      {focus.map((p) => (
        <div
          key={p.id}
          className="flex items-baseline gap-1.5 truncate rounded-lg px-3 py-1.5 hover:bg-muted/60"
        >
          <span className="truncate text-[13px] font-medium text-foreground/85">{p.name}</span>
          <span className="truncate text-[10.5px] text-muted-foreground/60">{p.organization}</span>
        </div>
      ))}

      <SectionLabel>Bronnen</SectionLabel>
      <NavRow icon={Calendar} label="Meetings" muted />
      <NavRow icon={Mail} label="Emails" muted />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Sidebar frame
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

        <div className="h-[560px] w-full overflow-y-auto scrollbar-none">{children}</div>
      </div>

      <p className="mt-3 text-[12.5px] leading-[1.5] text-muted-foreground">{description}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Wat we gebruiken (kort) + wat we parkeren
   ──────────────────────────────────────────────────────────── */

function SignalsPanel() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="border-b border-border/40 bg-gradient-to-br from-emerald-50 via-transparent to-transparent p-5">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-700">
          <Check className="h-3.5 w-3.5" />
          Wat de MVP gebruikt
        </div>
        <h3 className="font-heading mt-1 text-[18px] font-semibold">Drie velden. Meer niet.</h3>
      </div>

      <div className="divide-y divide-border/40">
        {signals.map((s) => (
          <div key={s.label} className="flex items-start gap-3 px-5 py-3">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[13px] font-semibold text-foreground">{s.label}</span>
                <code className="font-mono text-[10.5px] text-muted-foreground">{s.source}</code>
              </div>
              <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{s.usage}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

function ParkedPanel() {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 p-5">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <X className="h-3.5 w-3.5" />
        Bewust niet in deze MVP
      </div>
      <h3 className="font-heading mt-1 text-[18px] font-semibold">
        Pas toevoegen als het nut heeft
      </h3>
      <p className="mt-2 text-[12px] text-muted-foreground">
        De filosofie: toevoegen zodra iemand zegt &quot;dit mis ik&quot; — niet op basis van
        aannames.
      </p>
      <ul className="mt-4 space-y-3">
        {parked.map((item) => (
          <li key={item.label} className="flex gap-3">
            <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SidebarFrame
          variant="naam"
          label={variants[0].label}
          tag={variants[0].tag}
          description={variants[0].description}
        >
          <VariantNaam focus={focusProjectsMvp} />
        </SidebarFrame>

        <SidebarFrame
          variant="twee-regels"
          label={variants[1].label}
          tag={variants[1].tag}
          description={variants[1].description}
          highlight
        >
          <VariantTweeRegels focus={focusProjectsMvp} />
        </SidebarFrame>

        <SidebarFrame
          variant="inline"
          label={variants[2].label}
          tag={variants[2].tag}
          description={variants[2].description}
        >
          <VariantInline focus={focusProjectsMvp} />
        </SidebarFrame>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <SignalsPanel />
          <QueryPanel />
        </div>
        <ParkedPanel />
      </div>
    </div>
  );
}

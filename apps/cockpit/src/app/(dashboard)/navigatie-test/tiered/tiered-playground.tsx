"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  BookUser,
  BrainCircuit,
  Calendar,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FolderKanban,
  Home,
  Inbox,
  LogOut,
  Mail,
  Receipt,
  Search,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { focusProjectsMvp } from "../mock-data";

/* ────────────────────────────────────────────────────────────
   Routes — single source of truth for the mock
   ──────────────────────────────────────────────────────────── */

type Tier = "daily" | "source" | "setup" | "project";

interface Route {
  href: string;
  label: string;
  icon: LucideIcon;
  tier: Tier;
  badge?: number;
  keywords?: string[];
}

const dailyRoutes: Route[] = [
  { href: "/", label: "Home", icon: Home, tier: "daily" },
  { href: "/inbox", label: "Inbox", icon: Inbox, tier: "daily", badge: 12 },
  { href: "/review", label: "Review", icon: ClipboardCheck, tier: "daily", badge: 7 },
  { href: "/intelligence", label: "Intelligence", icon: BrainCircuit, tier: "daily" },
  { href: "/projects", label: "Projects", icon: FolderKanban, tier: "daily" },
];

const sourceRoutes: Route[] = [
  { href: "/meetings", label: "Meetings", icon: Calendar, tier: "source" },
  { href: "/emails", label: "Emails", icon: Mail, tier: "source" },
  {
    href: "/directory",
    label: "Directory",
    icon: BookUser,
    tier: "source",
    keywords: ["clients", "people"],
  },
];

const setupRoutes: Route[] = [
  { href: "/administratie", label: "Administratie", icon: Receipt, tier: "setup" },
  { href: "/admin/team", label: "Team", icon: Users, tier: "setup" },
  { href: "/agents", label: "Agents", icon: Bot, tier: "setup" },
];

const allRoutes: Route[] = [...dailyRoutes, ...sourceRoutes, ...setupRoutes];

/* ────────────────────────────────────────────────────────────
   Today's sidebar — for comparison
   ──────────────────────────────────────────────────────────── */

const todayPrimary: Route[] = [
  { href: "/", label: "Home", icon: Home, tier: "daily" },
  { href: "/inbox", label: "Inbox", icon: Inbox, tier: "daily", badge: 12 },
  { href: "/intelligence", label: "Intelligence", icon: BrainCircuit, tier: "daily" },
  { href: "/review", label: "Review", icon: ClipboardCheck, tier: "daily", badge: 7 },
  { href: "/projects", label: "Projects", icon: FolderKanban, tier: "daily" },
  { href: "/directory", label: "Directory", icon: BookUser, tier: "daily" },
  { href: "/administratie", label: "Administratie", icon: Receipt, tier: "daily" },
];

function NavRow({
  route,
  active = false,
  small = false,
  onClick,
}: {
  route: Route;
  active?: boolean;
  small?: boolean;
  onClick?: () => void;
}) {
  const Icon = route.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 ${small ? "py-1.5" : "py-2"} text-left text-sm font-medium transition-colors ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      <Icon className={`${small ? "h-4 w-4" : "h-[18px] w-[18px]"} shrink-0`} />
      <span className="flex-1 truncate">{route.label}</span>
      {route.badge !== undefined && route.badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
          {route.badge > 99 ? "99+" : route.badge}
        </span>
      )}
    </button>
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
   Today's sidebar (read-only mock for compare)
   ──────────────────────────────────────────────────────────── */

function TodaySidebar() {
  return (
    <div className="flex h-full flex-col p-3">
      <nav className="flex flex-col gap-0.5">
        {todayPrimary.map((r) => (
          <NavRow key={r.href} route={r} active={r.href === "/projects"} />
        ))}

        <SectionLabel>Actieve projecten</SectionLabel>
        {focusProjectsMvp.map((p) => (
          <div
            key={p.id}
            className="rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-muted/60"
          >
            <div className="truncate text-[13px] font-medium">{p.name}</div>
            <div className="truncate text-[10.5px] text-muted-foreground/70">{p.organization}</div>
          </div>
        ))}

        <SectionLabel>Bronnen</SectionLabel>
        <NavRow route={sourceRoutes[0]} small />
        <NavRow route={sourceRoutes[1]} small />

        <SectionLabel>Admin</SectionLabel>
        <NavRow route={setupRoutes[1]} small />
        <NavRow route={setupRoutes[2]} small />
      </nav>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Proposed sidebar — tiered, with palette + settings
   ──────────────────────────────────────────────────────────── */

function ProposedSidebar({
  onOpenPalette,
  onNavigate,
  activeHref,
}: {
  onOpenPalette: () => void;
  onNavigate: (href: string) => void;
  activeHref: string;
}) {
  const [bronnenOpen, setBronnenOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      {/* Search / palette trigger */}
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={onOpenPalette}
          className="group flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted/60"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Zoek of spring…</span>
          <kbd className="rounded border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/80">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {dailyRoutes.map((r) => (
          <NavRow
            key={r.href}
            route={r}
            active={r.href === activeHref}
            onClick={() => onNavigate(r.href)}
          />
        ))}

        <SectionLabel>Actieve projecten</SectionLabel>
        {focusProjectsMvp.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onNavigate(`/projects/${p.id}`)}
            className="rounded-lg px-3 py-1.5 text-left transition-colors hover:bg-muted/60"
          >
            <div className="truncate text-[13px] font-medium text-foreground/85">{p.name}</div>
            <div className="truncate text-[10.5px] text-muted-foreground/70">{p.organization}</div>
          </button>
        ))}

        {/* Bronnen — collapsible */}
        <button
          type="button"
          onClick={() => setBronnenOpen((v) => !v)}
          className="mb-1 mt-4 flex items-center gap-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
        >
          {bronnenOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Bronnen
        </button>
        {bronnenOpen &&
          sourceRoutes.map((r) => (
            <NavRow
              key={r.href}
              route={r}
              small
              active={r.href === activeHref}
              onClick={() => onNavigate(r.href)}
            />
          ))}
      </nav>

      {/* Avatar / settings menu — Tier 3 lives here */}
      <div className="border-t border-border/40 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-[12px] font-semibold text-primary-foreground">
                  S
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-foreground">Stef</div>
                  <div className="truncate text-[11px] text-muted-foreground">Admin</div>
                </div>
                <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            }
          />
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Setup & beheer
            </DropdownMenuLabel>
            {setupRoutes.map((r) => {
              const Icon = r.icon;
              return (
                <DropdownMenuItem
                  key={r.href}
                  onSelect={() => onNavigate(r.href)}
                  className="gap-2.5"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{r.label}</span>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2.5 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              <span>Uitloggen</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Command palette — works
   ──────────────────────────────────────────────────────────── */

interface PaletteEntry {
  id: string;
  label: string;
  icon: LucideIcon;
  group: string;
  href: string;
  keywords?: string[];
}

function buildPaletteEntries(): PaletteEntry[] {
  const groupLabel: Record<Tier, string> = {
    daily: "Dagelijks",
    source: "Bronnen",
    setup: "Setup & beheer",
    project: "Projecten",
  };
  const fromRoutes: PaletteEntry[] = allRoutes.map((r) => ({
    id: r.href,
    label: r.label,
    icon: r.icon,
    group: groupLabel[r.tier],
    href: r.href,
    keywords: r.keywords,
  }));
  const fromProjects: PaletteEntry[] = focusProjectsMvp.map((p) => ({
    id: `project-${p.id}`,
    label: p.name,
    icon: FolderKanban,
    group: groupLabel.project,
    href: `/projects/${p.id}`,
    keywords: [p.organization],
  }));
  return [...fromRoutes, ...fromProjects];
}

function PaletteContent({ onSelect }: { onSelect: (href: string) => void }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const entries = useMemo(() => buildPaletteEntries(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const haystack = [e.label, e.group, ...(e.keywords ?? [])].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [query, entries]);

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteEntry[]>();
    filtered.forEach((e) => {
      const arr = map.get(e.group) ?? [];
      arr.push(e);
      map.set(e.group, arr);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const safeIndex = Math.min(activeIndex, Math.max(0, filtered.length - 1));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(Math.min(safeIndex + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(Math.max(safeIndex - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = filtered[safeIndex];
      if (entry) onSelect(entry.href);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Zoek pagina, project of instelling…"
          className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
        />
        <kbd className="rounded border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          esc
        </kbd>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Geen resultaten voor &quot;{query}&quot;.
          </div>
        ) : (
          grouped.map(([group, items]) => (
            <div key={group} className="mb-2 last:mb-0">
              <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group}
              </div>
              {items.map((entry) => {
                const globalIndex = filtered.indexOf(entry);
                const isActive = globalIndex === safeIndex;
                const Icon = entry.icon;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(globalIndex)}
                    onClick={() => onSelect(entry.href)}
                    className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                      isActive ? "bg-muted text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{entry.label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground/60">
                      {entry.href}
                    </span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border/60 bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border/60 bg-background px-1 font-mono">↑↓</kbd>
            navigeer
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border/60 bg-background px-1 font-mono">↵</kbd>
            open
          </span>
        </div>
        <span>{filtered.length} resultaten</span>
      </div>
    </>
  );
}

function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onNavigate: (href: string) => void;
}) {
  const handleSelect = (href: string) => {
    onNavigate(href);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        {/* Mount only when open so query/index reset naturally — no effect needed. */}
        {open && <PaletteContent onSelect={handleSelect} />}
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────────────────────────────────────
   Sidebar frame — visual chrome around a sidebar mock
   ──────────────────────────────────────────────────────────── */

function SidebarFrame({
  label,
  tag,
  description,
  variant,
  highlight = false,
  children,
}: {
  label: string;
  tag: string;
  description: string;
  variant: string;
  highlight?: boolean;
  children: React.ReactNode;
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

        <div className="h-[640px] w-full overflow-y-auto scrollbar-none">{children}</div>
      </div>

      <p className="mt-3 text-[12.5px] leading-[1.5] text-muted-foreground">{description}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Toast — tiny non-modal "navigated to X" feedback
   ──────────────────────────────────────────────────────────── */

function NavigationToast({ href }: { href: string | null }) {
  if (!href) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border/60 bg-foreground px-4 py-2 text-[12px] font-medium text-background shadow-lg">
      <span className="font-mono opacity-70">navigate →</span> {href}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Main playground
   ──────────────────────────────────────────────────────────── */

export function TieredPlayground() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeHref, setActiveHref] = useState("/projects");
  const [toastHref, setToastHref] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  // Global ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleNavigate = (href: string) => {
    setActiveHref(href);
    setToastHref(href);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastHref(null), 1600);
  };

  return (
    <div className="space-y-10">
      {/* Side-by-side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SidebarFrame
          variant="vandaag"
          label="Vandaag"
          tag="Productie"
          description="11 vaste items + projecten. Alles zichtbaar, niets verborgen — maar ook niets dat eruit springt. Setup-items concurreren visueel met je dagelijkse werk."
        >
          <TodaySidebar />
        </SidebarFrame>

        <SidebarFrame
          variant="tiered"
          label="Voorgesteld — tiered"
          tag="Mock"
          description="5 daily drivers + projecten zichtbaar. Bronnen vouwt in. Setup zit in het avatar-menu links onderin. ⌘K opent een palette met álles. Klik en voel."
          highlight
        >
          <ProposedSidebar
            onOpenPalette={() => setPaletteOpen(true)}
            onNavigate={handleNavigate}
            activeHref={activeHref}
          />
        </SidebarFrame>
      </div>

      {/* How-to + rationale */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          <div className="border-b border-border/40 bg-gradient-to-br from-emerald-50 via-transparent to-transparent p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-700">
              Probeer het
            </div>
            <h3 className="font-heading mt-1 text-[18px] font-semibold">
              Drie dingen om te voelen
            </h3>
          </div>
          <ul className="divide-y divide-border/40">
            <li className="px-5 py-4">
              <div className="text-[13px] font-semibold text-foreground">
                1. Druk{" "}
                <kbd className="rounded border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                  ⌘K
                </kbd>{" "}
                (of{" "}
                <kbd className="rounded border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                  Ctrl+K
                </kbd>
                )
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Type &quot;adm&quot; — je bent in 3 toetsen bij Administratie. Geen item is ooit
                meer dan een typedruk verwijderd.
              </p>
            </li>
            <li className="px-5 py-4">
              <div className="text-[13px] font-semibold text-foreground">
                2. Klik op het avatar-blokje linksonder
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Setup, Team, Agents. Eén keer per week nodig — hoort niet in je daily rail.
              </p>
            </li>
            <li className="px-5 py-4">
              <div className="text-[13px] font-semibold text-foreground">
                3. Klik op &quot;Bronnen&quot;
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Meetings, Emails, Directory. Vouwt open als je ze echt nodig hebt — zit niet in de
                weg als je aan het werk bent.
              </p>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-dashed border-border/60 p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Rationale
          </div>
          <h3 className="font-heading mt-1 text-[18px] font-semibold">
            Waarom drie tiers, niet één lijst
          </h3>
          <ul className="mt-4 space-y-3 text-[12.5px] leading-[1.55] text-muted-foreground">
            <li>
              <span className="font-semibold text-foreground">Daily drivers (5):</span> de
              werkwoorden van je dag — capture, triage, denken, werken. Altijd zichtbaar.
            </li>
            <li>
              <span className="font-semibold text-foreground">Bronnen (3, gevouwen):</span>{" "}
              referentie- data. Je begint hier zelden — je komt hier via een project of via search.
            </li>
            <li>
              <span className="font-semibold text-foreground">Setup (3, in avatar):</span> wekelijks
              of minder. Hoort visueel bij &quot;account-y&quot; dingen, niet bij dagelijks werk.
            </li>
            <li>
              <span className="font-semibold text-foreground">⌘K als grote-broer:</span> alles is
              vindbaar, niets is &quot;verloren&quot;. Power-users gebruiken hem voor 70% van hun
              nav.
            </li>
            <li>
              <span className="font-semibold text-foreground">Geen items verloren:</span> 11 → 5
              zichtbaar, maar 11/11 bereikbaar in ≤2 acties.
            </li>
          </ul>
        </div>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onNavigate={handleNavigate}
      />
      <NavigationToast href={toastHref} />
    </div>
  );
}

"use client";

/**
 * MOCKUP — AI Issue Grouping, geïntegreerd in de bestaande DevHub UI
 *
 * Route: /mockup/grouping  (buiten de (app) layout zodat we zelf de complete
 * schermstructuur kunnen tonen — inclusief de voorgestelde uitbreiding
 * van de bestaande app-sidebar)
 *
 * Toont twee dingen:
 *   1. De bestaande sidebar, uitgebreid met een nieuwe "Thema's"-sectie
 *      onder de huidige "Status"-sectie.
 *   2. Een toggle op /issues: [Lijst] (default) vs [Gegroepeerd].
 *
 * Alle data hardcoded. Geen database-calls.
 *
 * AI raakt NIET aan: status, priority, assigned_to, title, description.
 * AI raakt WEL aan: cluster_id (welk thema) en duplicate-suggesties.
 */

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Users,
  Layers,
  LayoutList,
  Info,
  LayoutDashboard,
  Inbox,
  CircleDot,
  Loader2,
  CheckCircle2,
  XCircle,
  Settings,
  Plus,
  ChevronsUpDown,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { TypeBadge } from "@/components/shared/type-badge";
import { ComponentBadge } from "@/components/shared/component-badge";
import { PriorityDot } from "@/components/shared/priority-badge";
import { Avatar } from "@/components/shared/avatar";
import { cn } from "@repo/ui/utils";

// ─────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────

type MockIssue = {
  id: string;
  issue_number: number;
  title: string;
  description?: string;
  type: "bug" | "feature_request" | "question";
  status: "triage" | "backlog" | "todo" | "in_progress" | "done" | "cancelled";
  priority: "urgent" | "high" | "medium" | "low";
  component: "frontend" | "backend" | "api" | "database" | "prompt_ai" | "unknown";
  assigned?: string;
  time_ago: string;
  duplicate_of?: number;
  similarity_pct?: number;
  report_count?: number;
  cluster_id?: string;
};

type MockCluster = {
  id: string;
  theme: string;
  summary: string;
  size: number;
};

const CLUSTERS: MockCluster[] = [
  {
    id: "c1",
    theme: "Login & magic-link",
    summary: "Witte pagina, redirect-loops of vastloper na klikken op magic-link e-mail.",
    size: 8,
  },
  {
    id: "c2",
    theme: "Dashboard laadtijd",
    summary: "Traag laden, vooral bij meer dan 50 meetings.",
    size: 5,
  },
  {
    id: "c3",
    theme: "Export & rapportage",
    summary: "Feature-requests om data te exporteren naar PDF of Excel.",
    size: 4,
  },
  {
    id: "c4",
    theme: "Meeting transcripts & AI",
    summary: "Dubbele extracties, verkeerde sprekers, missend einde van meeting.",
    size: 6,
  },
  {
    id: "c5",
    theme: "Mobiele weergave",
    summary: "Responsive issues op tablet en iPhone SE.",
    size: 3,
  },
];

const STATUS_COUNTS = {
  triage: 12,
  backlog: 45,
  todo: 8,
  in_progress: 6,
  done: 20,
  cancelled: 3,
};

const ISSUES: MockIssue[] = [
  {
    id: "i1",
    issue_number: 142,
    title: "Magic link login blijft hangen op witte pagina",
    description: "Na klikken op de link laadt er niks meer. Gebeurt in Chrome en Safari.",
    type: "bug",
    status: "in_progress",
    priority: "urgent",
    component: "frontend",
    assigned: "Wouter de Vries",
    time_ago: "3 dagen geleden",
    report_count: 7,
    cluster_id: "c1",
  },
  {
    id: "i2",
    issue_number: 287,
    title: "Login redirect loopt vast na magic link",
    description: "Na login kom ik terug op de login pagina, oneindige loop.",
    type: "bug",
    status: "triage",
    priority: "high",
    component: "frontend",
    time_ago: "4 uur geleden",
    duplicate_of: 142,
    similarity_pct: 94,
    cluster_id: "c1",
  },
  {
    id: "i3",
    issue_number: 301,
    title: "Op mobiel kom ik niet binnen na inloggen",
    type: "bug",
    status: "triage",
    priority: "high",
    component: "frontend",
    time_ago: "1 dag geleden",
    duplicate_of: 142,
    similarity_pct: 87,
    cluster_id: "c1",
  },
  {
    id: "i4",
    issue_number: 255,
    title: "Magic link e-mail komt in spam terecht",
    type: "bug",
    status: "backlog",
    priority: "medium",
    component: "backend",
    time_ago: "1 week geleden",
    cluster_id: "c1",
  },
  {
    id: "i5",
    issue_number: 89,
    title: "Dashboard laadt traag met veel meetings",
    description: "Boven de 50 meetings wordt het onbruikbaar.",
    type: "bug",
    status: "todo",
    priority: "high",
    component: "frontend",
    assigned: "Stef",
    time_ago: "5 dagen geleden",
    report_count: 4,
    cluster_id: "c2",
  },
  {
    id: "i6",
    issue_number: 156,
    title: "Carrousel schokt op Safari",
    type: "bug",
    status: "triage",
    priority: "medium",
    component: "frontend",
    time_ago: "2 dagen geleden",
    duplicate_of: 89,
    similarity_pct: 71,
    cluster_id: "c2",
  },
  {
    id: "i7",
    issue_number: 178,
    title: "Meeting-notities exporteren naar PDF",
    type: "feature_request",
    status: "backlog",
    priority: "medium",
    component: "frontend",
    time_ago: "1 week geleden",
    cluster_id: "c3",
  },
  {
    id: "i8",
    issue_number: 202,
    title: "Actielijst exporteren naar Excel",
    type: "feature_request",
    status: "backlog",
    priority: "low",
    component: "frontend",
    time_ago: "5 dagen geleden",
    cluster_id: "c3",
  },
  {
    id: "i9",
    issue_number: 164,
    title: "Action items worden dubbel geëxtraheerd",
    type: "bug",
    status: "in_progress",
    priority: "high",
    component: "prompt_ai",
    assigned: "Ege Yilmaz",
    time_ago: "2 dagen geleden",
    cluster_id: "c4",
  },
  {
    id: "i10",
    issue_number: 221,
    title: "AI herkent sprekers niet goed bij 3+ personen",
    type: "bug",
    status: "backlog",
    priority: "medium",
    component: "prompt_ai",
    time_ago: "6 dagen geleden",
    cluster_id: "c4",
  },
  {
    id: "i11",
    issue_number: 233,
    title: "Sidebar valt over content op tablet",
    type: "bug",
    status: "triage",
    priority: "medium",
    component: "frontend",
    time_ago: "1 dag geleden",
    cluster_id: "c5",
  },
  {
    id: "i12",
    issue_number: 312,
    title: "Kun je de kleur van het thema wijzigen in settings?",
    type: "question",
    status: "triage",
    priority: "low",
    component: "unknown",
    time_ago: "1 uur geleden",
    // no cluster_id → unclustered
  },
];

// ─────────────────────────────────────────────────────────────
// Gesimuleerde app-sidebar (met nieuwe Thema's-sectie)
// ─────────────────────────────────────────────────────────────

type StatusNavItem = {
  label: string;
  status: string;
  icon: typeof Inbox;
  accent?: boolean;
};

const STATUS_NAV: StatusNavItem[] = [
  { label: "Triage", status: "triage", icon: Inbox, accent: true },
  { label: "Backlog", status: "backlog", icon: CircleDot },
  { label: "Te doen", status: "todo", icon: CircleDot },
  { label: "In behandeling", status: "in_progress", icon: Loader2 },
  { label: "Afgerond", status: "done", icon: CheckCircle2 },
  { label: "Geannuleerd", status: "cancelled", icon: XCircle },
];

function MockSidebar({
  activeCluster,
  onSelectCluster,
  activeStatus,
  onSelectStatus,
}: {
  activeCluster: string | null;
  onSelectCluster: (id: string | null) => void;
  activeStatus: string | null;
  onSelectStatus: (s: string | null) => void;
}) {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-screen">
      {/* Logo placeholder */}
      <div className="flex h-14 items-center px-4">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded bg-primary/20" />
          <span className="text-sm font-semibold">Jouw AI Partner</span>
        </div>
      </div>

      {/* Workspace switcher placeholder */}
      <div className="px-2 pb-2">
        <button className="flex w-full items-center justify-between rounded-md border border-border bg-background px-2 py-1.5 text-sm">
          <span>DevHub</span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-auto px-2 py-2">
        {/* Dashboard */}
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-[0.9rem] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <LayoutDashboard className="size-5" />
          Dashboard
        </button>

        {/* Alle issues */}
        <button
          onClick={() => {
            onSelectStatus(null);
            onSelectCluster(null);
          }}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[0.9rem] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            activeStatus === null &&
              activeCluster === null &&
              "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
          )}
        >
          <LayoutList className="size-5" />
          Alle issues
        </button>

        {/* Status-sectie (zoals nu al bestaat) */}
        <div className="pt-3 pb-1 px-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Status
          </span>
        </div>
        {STATUS_NAV.map((item) => {
          const Icon = item.icon;
          const count = STATUS_COUNTS[item.status as keyof typeof STATUS_COUNTS];
          const isActive = activeStatus === item.status;
          return (
            <button
              key={item.status}
              onClick={() => {
                onSelectStatus(item.status);
                onSelectCluster(null);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[0.9rem] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-5" />
              <span className="flex-1">{item.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium leading-none",
                    item.accent
                      ? "bg-orange-100 text-orange-700"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* ───── NIEUW: Thema's-sectie ───── */}
        <div className="pt-3 pb-1 px-2 flex items-center gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Thema&apos;s
          </span>
          <span className="rounded bg-primary/15 px-1 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-primary">
            nieuw
          </span>
          <Sparkles className="ml-auto size-3 text-muted-foreground" />
        </div>
        {CLUSTERS.map((c) => {
          const isActive = activeCluster === c.id;
          return (
            <button
              key={c.id}
              onClick={() => {
                onSelectCluster(c.id);
                onSelectStatus(null);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[0.9rem] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              )}
            >
              <span className="size-5 shrink-0 rounded bg-primary/15 grid place-items-center">
                <Sparkles className="size-3 text-primary" />
              </span>
              <span className="flex-1 truncate">{c.theme}</span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium leading-none text-muted-foreground">
                {c.size}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border px-2 py-2 space-y-0.5">
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-[0.9rem] text-sidebar-foreground/70 hover:bg-sidebar-accent">
          <Settings className="size-5" />
          Instellingen
        </button>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// Gesimuleerde topbar
// ─────────────────────────────────────────────────────────────

function MockTopBar() {
  return (
    <div className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm">
          <span>Jouw AI Partner — Cockpit</span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </button>
      </div>
      <button className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
        <Plus className="size-4" />
        Nieuw issue
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Gesimuleerde filter-bar (zoals huidige /issues)
// ─────────────────────────────────────────────────────────────

function MockFilterBar() {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3 pt-1">
      {["Status", "Prioriteit", "Type", "Component"].map((label) => (
        <button
          key={label}
          className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
        >
          {label}
          <ChevronDown className="size-3.5" />
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Issue row
// ─────────────────────────────────────────────────────────────

function MockIssueRow({ issue }: { issue: MockIssue }) {
  return (
    <div className="group border-b border-border px-4 py-3.5 transition-colors hover:bg-muted/50">
      <div className="flex items-start gap-2">
        <PriorityDot priority={issue.priority} />
        <span className="shrink-0 text-sm text-muted-foreground font-mono mt-0.5">
          #{issue.issue_number}
        </span>
        <span className="min-w-0 flex-1 font-medium text-foreground line-clamp-2">
          {issue.title}
        </span>
      </div>

      {issue.description && (
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2 pl-8">{issue.description}</p>
      )}

      {issue.duplicate_of !== undefined && (
        <div className="mt-1.5 ml-8 flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-xs">
          <AlertTriangle className="size-3.5 text-orange-600" />
          <span className="text-orange-800">
            Mogelijk duplicaat van{" "}
            <span className="font-mono font-semibold">#{issue.duplicate_of}</span>
            <span className="ml-1 text-orange-600">({issue.similarity_pct}% match)</span>
          </span>
          <button className="ml-auto rounded border border-orange-300 bg-white px-1.5 py-0.5 text-[0.65rem] font-medium text-orange-800 hover:bg-orange-100">
            Mergen
          </button>
          <button className="rounded px-1 text-[0.65rem] text-orange-700 hover:underline">
            Geen duplicaat
          </button>
        </div>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-8 sm:gap-2">
        <TypeBadge type={issue.type} />
        <StatusBadge status={issue.status} />
        <ComponentBadge component={issue.component} />

        {issue.report_count !== undefined && issue.report_count > 1 && (
          <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[0.7rem] font-medium leading-none text-blue-700">
            <Users className="size-3" />
            {issue.report_count}× gemeld
          </span>
        )}

        {issue.assigned ? <Avatar name={issue.assigned} /> : <span className="size-7" />}
        <span className="ml-auto text-xs sm:text-sm text-muted-foreground">{issue.time_ago}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Cluster section (gegroepeerde weergave)
// ─────────────────────────────────────────────────────────────

function ClusterSection({ cluster, issues }: { cluster: MockCluster; issues: MockIssue[] }) {
  const [open, setOpen] = useState(true);

  return (
    <section className="mb-4 overflow-hidden rounded-lg border border-border bg-background">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-3 border-b border-border bg-muted/40 px-4 py-3 text-left hover:bg-muted/60"
      >
        {open ? (
          <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-primary" />
            <h3 className="font-semibold text-foreground">{cluster.theme}</h3>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
              {cluster.size} issues
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{cluster.summary}</p>
        </div>
      </button>

      {open && (
        <div>
          {issues.map((i) => (
            <MockIssueRow key={i.id} issue={i} />
          ))}
          {cluster.size > issues.length && (
            <div className="border-b border-border px-4 py-2.5 text-center">
              <button className="text-xs font-medium text-primary hover:underline">
                Toon overige {cluster.size - issues.length} issues in dit thema →
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function GroupingMockupPage() {
  const [view, setView] = useState<"list" | "grouped">("list");
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [activeCluster, setActiveCluster] = useState<string | null>(null);

  // Filter: status OR cluster (beide exclusief via de sidebar)
  const filtered = ISSUES.filter((i) => {
    if (activeStatus && i.status !== activeStatus) return false;
    if (activeCluster && i.cluster_id !== activeCluster) return false;
    return true;
  });

  // Gegroepeerd: alleen clusters tonen waar issues in zitten die door filter passen
  const clustersToShow =
    activeCluster !== null
      ? CLUSTERS.filter((c) => c.id === activeCluster)
      : CLUSTERS.filter((c) => filtered.some((i) => i.cluster_id === c.id));

  const unclustered = filtered.filter((i) => !i.cluster_id);

  // Title-berekening
  const pageTitle = activeCluster
    ? (CLUSTERS.find((c) => c.id === activeCluster)?.theme ?? "Issues")
    : activeStatus
      ? {
          triage: "Triage",
          backlog: "Backlog",
          todo: "Te doen",
          in_progress: "In behandeling",
          done: "Afgerond",
          cancelled: "Geannuleerd",
        }[activeStatus]
      : "Alle issues";

  return (
    <div className="flex min-h-screen">
      <MockSidebar
        activeCluster={activeCluster}
        onSelectCluster={setActiveCluster}
        activeStatus={activeStatus}
        onSelectStatus={setActiveStatus}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <MockTopBar />

        <main className="flex flex-1 flex-col px-4 sm:px-6 lg:px-8 py-4">
          {/* Mockup-banner */}
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <Info className="mt-0.5 size-4 shrink-0" />
            <div>
              <strong>Mockup</strong> — voorgestelde uitbreiding van{" "}
              <code className="rounded bg-amber-100 px-1 text-xs">/issues</code>. De sidebar links
              krijgt een nieuwe <strong>Thema&apos;s</strong>-sectie onder &ldquo;Status&rdquo;.
              Rechts komt een toggle voor lijst- of gegroepeerde weergave. Verder verandert er niks
              aan de pagina.
              <div className="mt-1 text-xs text-amber-800">
                Klik in de sidebar op een status of thema om het filter-gedrag te voelen.
              </div>
            </div>
          </div>

          {/* Header met toggle */}
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{pageTitle}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {activeCluster
                  ? CLUSTERS.find((c) => c.id === activeCluster)?.summary
                  : `${filtered.length} issues`}
              </p>
            </div>
            <div className="flex overflow-hidden rounded-md border border-border">
              <button
                onClick={() => setView("list")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium",
                  view === "list"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted",
                )}
              >
                <LayoutList className="size-4" />
                Lijst
              </button>
              <button
                onClick={() => setView("grouped")}
                className={cn(
                  "flex items-center gap-1.5 border-l border-border px-3 py-1.5 text-sm font-medium",
                  view === "grouped"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted",
                )}
              >
                <Layers className="size-4" />
                Gegroepeerd
              </button>
            </div>
          </div>

          {/* Filter-bar (zoals nu) */}
          <MockFilterBar />

          {/* Content */}
          {view === "list" ? (
            <section className="mt-3 overflow-hidden rounded-lg border border-border bg-background">
              {filtered.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Geen issues voor dit filter.
                </div>
              ) : (
                filtered.map((i) => <MockIssueRow key={i.id} issue={i} />)
              )}
            </section>
          ) : (
            <div className="mt-3">
              {clustersToShow.map((c) => {
                const issuesInCluster = filtered.filter((i) => i.cluster_id === c.id);
                return <ClusterSection key={c.id} cluster={c} issues={issuesInCluster} />;
              })}

              {unclustered.length > 0 && activeCluster === null && (
                <section className="mb-4 overflow-hidden rounded-lg border border-dashed border-border bg-background">
                  <div className="flex items-start gap-3 border-b border-border bg-muted/30 px-4 py-3">
                    <Layers className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold text-foreground">Niet geclusterd</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        AI kon deze issues nog niet aan een thema koppelen.
                      </p>
                    </div>
                  </div>
                  {unclustered.map((i) => (
                    <MockIssueRow key={i.id} issue={i} />
                  ))}
                </section>
              )}

              {clustersToShow.length === 0 && unclustered.length === 0 && (
                <div className="rounded-lg border border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
                  Geen issues voor dit filter.
                </div>
              )}
            </div>
          )}

          {/* Uitleg-blok */}
          <div className="mt-8 rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <h4 className="mb-2 font-semibold">Wat doet AI hier wel en niet?</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 font-medium text-green-700">✓ WEL door AI</p>
                <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
                  <li>Thema&apos;s benoemen en samenvatten</li>
                  <li>Issues aan een thema koppelen (cluster_id)</li>
                  <li>Duplicaten voorstellen (met % match)</li>
                </ul>
              </div>
              <div>
                <p className="mb-1 font-medium text-red-700">✗ NIET door AI</p>
                <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
                  <li>Status aanpassen (triage, backlog, todo, …)</li>
                  <li>Priority wijzigen</li>
                  <li>Toewijzen aan iemand</li>
                  <li>Auto-mergen van duplicaten</li>
                </ul>
              </div>
            </div>
            <p className="mt-3 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
              De sidebar-sectie &ldquo;Status&rdquo; en de huidige filter-bar blijven precies zoals
              ze nu werken. De nieuwe &ldquo;Thema&apos;s&rdquo;-sectie is puur additief: je kunt
              hem negeren en alles werkt als voorheen.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link href="/issues" className="hover:underline">
              → Bekijk de echte /issues pagina
            </Link>
            <span>·</span>
            <span>Route: /mockup/grouping</span>
          </div>
        </main>
      </div>
    </div>
  );
}

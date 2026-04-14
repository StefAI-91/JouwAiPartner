"use client";

/**
 * MOCKUP — AI Issue Grouping
 *
 * Dit is een visuele schets. Volledig hardcoded data, geen database-calls.
 * Route: /mockup/grouping
 *
 * Doel: laten zien hoe AI-gegroepeerde issues eruitzien in de DevHub UI,
 * zodat we kunnen kiezen of we deze kant op willen bouwen.
 *
 * Belangrijk: `status`, `priority` en `assigned_to` worden NIET door AI gezet.
 * Het AI-werk zit alleen in `cluster_id` (aan welk thema hoort dit issue).
 */

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Users,
  Layers,
  LayoutList,
  Info,
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
  // AI-velden
  duplicate_of?: number;
  similarity_pct?: number;
  // Cluster-stats
  report_count?: number; // aantal keer gemeld (via duplicates)
};

type MockCluster = {
  id: string;
  theme: string;
  summary: string;
  size: number;
  severity_hint: "critical" | "high" | "medium" | "low";
  issues: MockIssue[];
};

const CLUSTERS: MockCluster[] = [
  {
    id: "c1",
    theme: "Login & magic-link problemen",
    summary:
      "Gebruikers rapporteren witte pagina, redirect-loops of vastloper na klikken op de magic-link e-mail.",
    size: 8,
    severity_hint: "high",
    issues: [
      {
        id: "i1",
        issue_number: 142,
        title: "Magic link login blijft hangen op witte pagina",
        description:
          "Na klikken op de link uit de e-mail laadt er niks meer. Gebeurt in Chrome en Safari.",
        type: "bug",
        status: "in_progress",
        priority: "urgent",
        component: "frontend",
        assigned: "Wouter de Vries",
        time_ago: "3 dagen geleden",
        report_count: 7,
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
      },
      {
        id: "i5",
        issue_number: 198,
        title: "Kunnen we ook met Google SSO inloggen?",
        type: "feature_request",
        status: "backlog",
        priority: "low",
        component: "backend",
        time_ago: "2 weken geleden",
      },
    ],
  },
  {
    id: "c2",
    theme: "Dashboard laadtijd",
    summary:
      "Meerdere meldingen over traag laden van het dashboard, vooral bij meer dan 50 meetings.",
    size: 5,
    severity_hint: "medium",
    issues: [
      {
        id: "i6",
        issue_number: 89,
        title: "Dashboard laadt traag met veel meetings",
        description: "Boven de 50 meetings wordt het onbruikbaar traag.",
        type: "bug",
        status: "todo",
        priority: "high",
        component: "frontend",
        assigned: "Stef",
        time_ago: "5 dagen geleden",
        report_count: 4,
      },
      {
        id: "i7",
        issue_number: 156,
        title: "Carrousel schokt op Safari",
        type: "bug",
        status: "triage",
        priority: "medium",
        component: "frontend",
        time_ago: "2 dagen geleden",
        duplicate_of: 89,
        similarity_pct: 71,
      },
      {
        id: "i8",
        issue_number: 211,
        title: "Pulse-strip laadt pas na 5 seconden",
        type: "bug",
        status: "backlog",
        priority: "medium",
        component: "api",
        time_ago: "1 week geleden",
      },
    ],
  },
  {
    id: "c3",
    theme: "Export & rapportage",
    summary:
      "Feature requests om meetings, action items en dashboards te exporteren naar PDF of Excel.",
    size: 4,
    severity_hint: "low",
    issues: [
      {
        id: "i9",
        issue_number: 178,
        title: "Meeting-notities exporteren naar PDF",
        type: "feature_request",
        status: "backlog",
        priority: "medium",
        component: "frontend",
        time_ago: "1 week geleden",
      },
      {
        id: "i10",
        issue_number: 202,
        title: "Actielijst exporteren naar Excel",
        type: "feature_request",
        status: "backlog",
        priority: "low",
        component: "frontend",
        time_ago: "5 dagen geleden",
      },
      {
        id: "i11",
        issue_number: 245,
        title: "Kunnen we een weekrapport per klant automatisch mailen?",
        type: "feature_request",
        status: "triage",
        priority: "medium",
        component: "backend",
        time_ago: "2 dagen geleden",
      },
    ],
  },
  {
    id: "c4",
    theme: "Meeting transcripts & AI extracties",
    summary:
      "Klachten over onnauwkeurige extractie, dubbele action items en verkeerd ingeschatte spreker-namen.",
    size: 6,
    severity_hint: "high",
    issues: [
      {
        id: "i12",
        issue_number: 164,
        title: "Action items worden dubbel geëxtraheerd",
        type: "bug",
        status: "in_progress",
        priority: "high",
        component: "prompt_ai",
        assigned: "Ege Yilmaz",
        time_ago: "2 dagen geleden",
      },
      {
        id: "i13",
        issue_number: 221,
        title: "AI herkent sprekers niet goed bij 3+ personen",
        type: "bug",
        status: "backlog",
        priority: "medium",
        component: "prompt_ai",
        time_ago: "6 dagen geleden",
      },
      {
        id: "i14",
        issue_number: 190,
        title: "Transcripts missen laatste 2 minuten van meeting",
        type: "bug",
        status: "done",
        priority: "urgent",
        component: "api",
        assigned: "Stef",
        time_ago: "3 weken geleden",
      },
    ],
  },
  {
    id: "c5",
    theme: "Mobiele weergave",
    summary: "Responsive issues: knoppen afgesneden, menu's onbereikbaar op kleine schermen.",
    size: 3,
    severity_hint: "medium",
    issues: [
      {
        id: "i15",
        issue_number: 233,
        title: "Sidebar valt over content op tablet",
        type: "bug",
        status: "triage",
        priority: "medium",
        component: "frontend",
        time_ago: "1 dag geleden",
      },
      {
        id: "i16",
        issue_number: 267,
        title: "Action-menu onbereikbaar op iPhone SE",
        type: "bug",
        status: "backlog",
        priority: "low",
        component: "frontend",
        time_ago: "4 dagen geleden",
      },
    ],
  },
];

const UNCLUSTERED: MockIssue[] = [
  {
    id: "u1",
    issue_number: 312,
    title: "Kun je de kleur van het thema wijzigen in settings?",
    type: "question",
    status: "triage",
    priority: "low",
    component: "unknown",
    time_ago: "1 uur geleden",
  },
  {
    id: "u2",
    issue_number: 315,
    title: "Eenmalige integratie met HubSpot onderzoeken",
    type: "feature_request",
    status: "triage",
    priority: "low",
    component: "unknown",
    time_ago: "30 min geleden",
  },
];

// ─────────────────────────────────────────────────────────────
// Cluster sidebar
// ─────────────────────────────────────────────────────────────

function ClusterSidebar({
  activeId,
  onSelect,
}: {
  activeId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const totalClustered = CLUSTERS.reduce((s, c) => s + c.size, 0);

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-muted/30 px-3 py-4">
      <div className="mb-3 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Sparkles className="size-3.5" />
        AI-thema&apos;s
      </div>

      <button
        onClick={() => onSelect(null)}
        className={cn(
          "mb-1 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
          activeId === null ? "bg-primary/10 text-primary" : "hover:bg-muted",
        )}
      >
        <span className="flex items-center gap-2">
          <Layers className="size-4" />
          Alle thema&apos;s
        </span>
        <span className="text-xs text-muted-foreground">{totalClustered}</span>
      </button>

      <div className="my-2 h-px bg-border" />

      {CLUSTERS.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={cn(
            "mb-0.5 flex w-full items-start justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
            activeId === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted",
          )}
        >
          <span className="min-w-0 line-clamp-2 leading-snug">{c.theme}</span>
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
            {c.size}
          </span>
        </button>
      ))}

      <div className="my-2 h-px bg-border" />

      <button
        onClick={() => onSelect("unclustered")}
        className={cn(
          "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
          activeId === "unclustered" ? "bg-primary/10 text-primary" : "hover:bg-muted",
        )}
      >
        <span className="text-muted-foreground">Niet geclusterd</span>
        <span className="text-xs text-muted-foreground">{UNCLUSTERED.length}</span>
      </button>

      <div className="mt-6 rounded-md border border-dashed border-border bg-background/60 p-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Info className="size-3.5 text-muted-foreground" />
          Laatste AI-run
        </div>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          14 apr 2026, 02:15
          <br />
          615 issues geanalyseerd
          <br />
          door Claude Sonnet 4.6
        </p>
        <button className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted">
          Opnieuw clusteren
        </button>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// Issue row (mockup variant, stijl matcht echte IssueRow)
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

      {/* Duplicaat-strip */}
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

      {/* Badges rij */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-8 sm:gap-2">
        <TypeBadge type={issue.type} />
        <StatusBadge status={issue.status} />
        <ComponentBadge component={issue.component} />

        {/* Report count badge — alleen op "representative" issues */}
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
// Cluster section
// ─────────────────────────────────────────────────────────────

function ClusterSection({ cluster }: { cluster: MockCluster }) {
  const [open, setOpen] = useState(true);
  const severityColor = {
    critical: "text-red-600",
    high: "text-orange-600",
    medium: "text-yellow-600",
    low: "text-muted-foreground",
  }[cluster.severity_hint];

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
            <Sparkles className={cn("size-4 shrink-0", severityColor)} />
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
          {cluster.issues.map((i) => (
            <MockIssueRow key={i.id} issue={i} />
          ))}
          {cluster.size > cluster.issues.length && (
            <div className="border-b border-border px-4 py-2.5 text-center">
              <button className="text-xs font-medium text-primary hover:underline">
                Toon overige {cluster.size - cluster.issues.length} issues in dit thema →
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
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const [view, setView] = useState<"grouped" | "flat">("grouped");

  const visibleClusters =
    activeCluster === null || activeCluster === "unclustered"
      ? CLUSTERS
      : CLUSTERS.filter((c) => c.id === activeCluster);

  const showUnclustered = activeCluster === null || activeCluster === "unclustered";

  return (
    <div className="flex flex-1">
      <ClusterSidebar activeId={activeCluster} onSelect={setActiveCluster} />

      <div className="min-w-0 flex-1 px-6 py-6">
        {/* Mockup-banner */}
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <Info className="mt-0.5 size-4 shrink-0" />
          <div>
            <strong>Mockup</strong> — dit is een visuele schets met hardcoded voorbeelddata. Geen
            echte AI-run, geen echte issues. Bedoeld om de UI te voelen voordat we bouwen.
          </div>
        </div>

        {/* Header + view toggle */}
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Issues per thema</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Claude groepeert &apos;s nachts alle issues op onderwerp. Jouw statussen en
              prioriteiten blijven ongemoeid.
            </p>
          </div>
          <div className="flex overflow-hidden rounded-md border border-border">
            <button
              onClick={() => setView("grouped")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium",
                view === "grouped"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted",
              )}
            >
              <Layers className="size-4" />
              Per thema
            </button>
            <button
              onClick={() => setView("flat")}
              className={cn(
                "flex items-center gap-1.5 border-l border-border px-3 py-1.5 text-sm font-medium",
                view === "flat"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted",
              )}
            >
              <LayoutList className="size-4" />
              Vlakke lijst
            </button>
          </div>
        </div>

        {view === "grouped" ? (
          <>
            {activeCluster !== "unclustered" &&
              visibleClusters.map((c) => <ClusterSection key={c.id} cluster={c} />)}

            {showUnclustered && (
              <section className="mb-4 overflow-hidden rounded-lg border border-dashed border-border bg-background">
                <div className="flex items-start gap-3 border-b border-border bg-muted/30 px-4 py-3">
                  <Layers className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold text-foreground">Niet geclusterd</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      AI kon deze issues nog niet aan een thema koppelen — te weinig context of te
                      uniek.
                    </p>
                  </div>
                </div>
                {UNCLUSTERED.map((i) => (
                  <MockIssueRow key={i.id} issue={i} />
                ))}
              </section>
            )}
          </>
        ) : (
          <section className="overflow-hidden rounded-lg border border-border bg-background">
            {[...CLUSTERS.flatMap((c) => c.issues), ...UNCLUSTERED].map((i) => (
              <MockIssueRow key={i.id} issue={i} />
            ))}
          </section>
        )}

        {/* Uitleg-blok onder */}
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
                <li>Auto-mergen van duplicaten — altijd een menselijke klik</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

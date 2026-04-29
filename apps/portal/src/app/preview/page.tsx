import {
  ArrowUpRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  CornerDownRight,
  FileText,
  Inbox,
  LifeBuoy,
  ListChecks,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import { Badge } from "@repo/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

const closedThisWeek = [
  {
    id: "JAP-642",
    title: "Witte schermen na inloggen",
    severity: "Critical",
    symptom:
      "Drie gebruikers konden niet inloggen tussen 14:02 en 16:18 op vrijdag — pagina bleef wit na het invoeren van credentials.",
    cause:
      "Race condition in session-refresh: de Userback-widget initialiseerde vóór de auth-handshake en blokkeerde het token-rewrite-event.",
    fix: "Widget-loader verplaatst naar na auth-handshake; session-refresh wacht nu expliciet op auth-state ‘ready’.",
    since: "do 16:42",
    effect: "0 nieuwe meldingen sinds deploy.",
    closedBy: "Wouter",
  },
  {
    id: "JAP-638",
    title: "Bug-reporter zag eigen ticket niet terug",
    severity: "Hoog",
    symptom:
      "Userback-meldingen kwamen niet terug in de eigen ticketlijst van de melder; alleen team zag ze.",
    cause:
      "Reporter-id werd opgeslagen op de issue maar niet meegenomen in de RLS-policy voor portal-readers.",
    fix: "RLS uitgebreid met reporter-clause; backfill gedraaid op 412 historische tickets.",
    since: "wo 11:08",
    effect: "Alle 412 historische tickets nu zichtbaar.",
    closedBy: "Ege",
  },
  {
    id: "JAP-629",
    title: "Dubbele e-mailmeldingen bij issue-update",
    severity: "Midden",
    symptom: "Bij elke comment kreeg de assignee twee identieke e-mails.",
    cause: "GitHub-webhook triggerde dezelfde notificatie als de in-app comment-trigger.",
    fix: "Idempotency-key toegevoegd op (issue, comment_hash, recipient).",
    since: "ma 09:24",
    effect: "Mailvolume −41% deze week.",
    closedBy: "Wouter",
  },
];

const openRisks = [
  {
    title: "Metadata-prefill bij bugreports nog niet live",
    impact: "Reporter-info ontbreekt op nieuwe meldingen → triage trager.",
    status: "Ingepland week 19",
    tone: "warning" as const,
  },
  {
    title: "E-mail-pipeline draait nog op Cohere v3",
    impact: "Lagere embedding-kwaliteit op recente threads.",
    status: "Backlog · geen ETA",
    tone: "warning" as const,
  },
  {
    title: "Geen automatische backup op staging-DB",
    impact: "Bij corrupte seed verliezen we max 24u test-data.",
    status: "Acceptabel · staging only",
    tone: "info" as const,
  },
];

const inProgress = [
  {
    id: "JAP-651",
    title: "Tweefactor-login (TOTP)",
    owner: "Wouter",
    since: "3 dagen",
    bucket: "Sprint 18",
  },
  {
    id: "JAP-647",
    title: "Userback v2 widget upgrade",
    owner: "Ege",
    since: "1 dag",
    bucket: "Sprint 18",
  },
  {
    id: "JAP-655",
    title: "CSV-export op de issue-lijst",
    owner: "Wouter",
    since: "5 uur",
    bucket: "Sprint 18",
  },
];

const waitingOnYou = [
  {
    title: "Tekst voor onboarding-screen aanleveren",
    since: "3 dagen open",
    blocking: "JAP-651 · Tweefactor-login",
  },
  {
    title: "Goedkeuring SLA-voorstel v2",
    since: "1 dag open",
    blocking: "Contract-bijlage week 19",
  },
];

const roadmapColumns: {
  label: string;
  tone: "success" | "warning" | "muted";
  items: { name: string; est: string; note: string }[];
}[] = [
  {
    label: "Ingepland · sprint 18",
    tone: "success",
    items: [
      { name: "Tweefactor-login", est: "6u", note: "in review" },
      { name: "Userback v2 widget", est: "4u", note: "" },
      { name: "CSV-export op issues", est: "3u", note: "" },
    ],
  },
  {
    label: "Wacht op jouw keuze",
    tone: "warning",
    items: [
      { name: "Slack-integratie meldingen", est: "12u", note: "vraagt vrijgave kanaal-budget" },
      { name: "Bulk-import CSV (klanten)", est: "8u", note: "scope-vraag uit" },
    ],
  },
  {
    label: "Bewust uitgesteld",
    tone: "muted",
    items: [
      { name: "Mobiele app", est: "—", note: "reden: focus op web-stabiliteit Q2" },
      { name: "AI-suggesties op feedback-form", est: "—", note: "reden: wacht op verifier-flow" },
    ],
  },
];

export default function PreviewPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />

        <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-8 px-8 py-8 lg:px-12 lg:py-10">
          <Hero />
          <StatusBanner />
          <BriefingCard />

          <div className="grid gap-6 lg:grid-cols-3">
            <ClosedThisWeekCard className="lg:col-span-2" />
            <SidePanelCards />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <InProgressCard className="lg:col-span-2" />
            <WaitingOnYouCard />
          </div>

          <RoadmapSection />
          <SlaCard />
        </main>
      </div>
    </div>
  );
}

/* ─── Sidebar ─────────────────────────────────────────────────────── */

function Sidebar() {
  const primary = [
    { label: "Briefing", icon: BookOpen, active: true },
    { label: "Issues", icon: Inbox, badge: 12 },
    { label: "Roadmap", icon: MapPin },
    { label: "Feedback geven", icon: MessageCircle },
  ];
  const reports = [
    { label: "SLA & rapporten", icon: ListChecks },
    { label: "Wekelijkse update", icon: CalendarClock },
  ];
  const docs = [
    { label: "Contract", icon: FileText },
    { label: "SLA-document", icon: FileText },
  ];

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border/50 bg-white/60 backdrop-blur-sm lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-4">
        <div className="grid size-8 place-items-center rounded-lg bg-primary text-[13px] font-bold text-primary-foreground">
          JAP
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Jouw AI Partner</div>
          <div className="text-[11px] text-muted-foreground">Klantportaal</div>
        </div>
      </div>

      <div className="px-3 pb-2">
        <button className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm font-medium hover:bg-muted/40">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold">Connect-CRM</div>
            <div className="truncate text-[11px] text-muted-foreground">
              Stefan · Connectaal B.V.
            </div>
          </div>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        <SidebarSection items={primary} />

        <SidebarHeader>Rapporten</SidebarHeader>
        <SidebarSection items={reports} small />

        <SidebarHeader>Documenten</SidebarHeader>
        <SidebarSection items={docs} small />

        <div className="mt-auto pt-4">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground">
            <LifeBuoy className="size-4" />
            <span>Vraag aan team</span>
          </button>
        </div>
      </nav>

      <div className="border-t border-border/50 px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="grid size-8 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
            SS
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13px] font-medium">Stefan Smit</div>
            <div className="truncate text-[11px] text-muted-foreground">stefan@connectaal.nl</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
      {children}
    </div>
  );
}

function SidebarSection({
  items,
  small,
}: {
  items: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    active?: boolean;
    badge?: number;
  }[];
  small?: boolean;
}) {
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            className={`flex items-center gap-3 rounded-lg px-3 ${small ? "py-1.5" : "py-2"} text-left text-sm font-medium transition-colors ${
              item.active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <Icon className={`${small ? "size-4" : "size-[17px]"} shrink-0`} />
            <span className="flex-1">{item.label}</span>
            {item.badge !== undefined && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-foreground/10 px-1.5 text-[10px] font-bold text-foreground/70">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}

/* ─── Top Bar ─────────────────────────────────────────────────────── */

function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border/50 bg-white/70 px-8 backdrop-blur-md lg:px-12">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Connect-CRM</span>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-foreground">Briefing</span>
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <span className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[12px]">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          <span className="text-muted-foreground">Live · ververst </span>
          <span className="font-mono text-[11px] text-foreground">14:32</span>
        </span>
        <button className="rounded-full border border-border bg-card px-3 py-1 text-[12px] text-muted-foreground hover:bg-muted/40">
          Week 18 · 2026
        </button>
      </div>
    </header>
  );
}

/* ─── Hero ────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="size-5 text-primary/70" />
          <span className="text-sm font-medium text-muted-foreground">
            Goedemorgen, Stefan — maandag 27 april
          </span>
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Hier is jullie week.</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Drie issues gesloten, één feature wacht op jou, geen actieve incidenten. Alles wat hier
          staat is herleidbaar naar een ticket of meeting — klik door of laat een commentaar achter.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/40">
          Wekelijkse PDF
        </button>
        <button className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Nieuw ticket
        </button>
      </div>
    </div>
  );
}

/* ─── Status Banner ───────────────────────────────────────────────── */

function StatusBanner() {
  return (
    <Card className="ring-success/30 bg-gradient-to-br from-success/5 via-transparent to-transparent">
      <CardContent className="flex flex-wrap items-center gap-4 px-5">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-full bg-success/15">
            <CheckCircle2 className="size-4 text-success" />
          </span>
          <div>
            <div className="font-heading text-[15px] font-semibold">Geen actieve incidenten.</div>
            <div className="text-[12.5px] text-muted-foreground">
              Laatste deploy gisteren 16:42 · 1.402 requests in het laatste uur · 0 errors boven p1.
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-6 text-sm">
          <Stat label="Verzonden" value="3" />
          <span className="h-8 w-px bg-border" />
          <Stat label="Open" value="12" />
          <span className="h-8 w-px bg-border" />
          <Stat label="Vertraagd" value="1" tone="warning" />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      <span
        className={`font-mono text-[20px] font-semibold leading-none ${tone === "warning" ? "text-amber-600" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Briefing Card ───────────────────────────────────────────────── */

function BriefingCard() {
  return (
    <Card className="bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent ring-primary/15">
      <CardHeader className="px-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="size-3.5" />
          Hoofdpunt van de week
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5">
        <p
          className="text-[20px] leading-[1.45] text-foreground/95 lg:text-[22px]"
          style={{ fontFamily: "var(--font-serif-display, var(--font-heading))" }}
        >
          Backend-stabiliteit verbeterd na het inlog-incident van vrijdag.{" "}
          <span className="text-foreground">Drie meldingen gesloten</span> met dezelfde root cause
          in de Userback-koppeling. Eén feature wacht expliciet op{" "}
          <span className="text-primary">jouw keuze</span> — zie roadmap onderaan.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
          <Badge variant="secondary" className="font-mono text-[10.5px]">
            agent · claude-sonnet-4.6
          </Badge>
          <span>·</span>
          <span>
            Gecontroleerd door <span className="font-medium text-foreground">Wouter</span> vanmorgen
            09:14
          </span>
          <span>·</span>
          <a className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
            bron-issues <ArrowUpRight className="size-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Closed This Week ────────────────────────────────────────────── */

function ClosedThisWeekCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-baseline justify-between px-5">
        <CardTitle>Gesloten deze week</CardTitle>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Symptoom · oorzaak · effect
        </span>
      </CardHeader>
      <CardContent className="px-0">
        <ul className="divide-y divide-border/60">
          {closedThisWeek.map((item) => (
            <li
              key={item.id}
              className="group/closed grid gap-3 px-5 py-4 transition-colors hover:bg-muted/30"
            >
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-mono text-[11px] text-muted-foreground/80">{item.id}</span>
                <span className="font-heading text-[16px] font-medium leading-tight text-foreground">
                  {item.title}
                </span>
                <Badge
                  variant={
                    item.severity === "Critical"
                      ? "destructive"
                      : item.severity === "Hoog"
                        ? "secondary"
                        : "outline"
                  }
                  className="text-[10.5px]"
                >
                  {item.severity}
                </Badge>
                <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-success">
                  <CheckCircle2 className="size-3.5" />
                  sinds {item.since}
                </span>
              </div>
              <div className="grid gap-1.5 text-[13px] leading-relaxed text-muted-foreground">
                <Row label="Symptoom" value={item.symptom} />
                <Row label="Oorzaak" value={item.cause} />
                <Row label="Fix" value={item.fix} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground/80">
                <span>{item.effect}</span>
                <span>·</span>
                <span>
                  Door <span className="font-medium text-foreground">{item.closedBy}</span>
                </span>
                <button className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground opacity-0 transition group-hover/closed:opacity-100 hover:bg-muted/40 hover:text-foreground">
                  <MessageSquareText className="size-3" /> reageer
                </button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[78px_1fr] gap-3">
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}

/* ─── Sidebar Cards: Open Risks + (top) ───────────────────────────── */

function SidePanelCards() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-baseline justify-between px-5">
          <CardTitle>Open risico&apos;s</CardTitle>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
            eerlijk lijstje
          </span>
        </CardHeader>
        <CardContent className="px-5">
          <ul className="space-y-4">
            {openRisks.map((risk) => (
              <li
                key={risk.title}
                className={`border-l-2 pl-3 ${
                  risk.tone === "warning" ? "border-amber-500" : "border-border"
                }`}
              >
                <p className="font-heading text-[14px] font-medium leading-snug text-foreground">
                  {risk.title}
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                  {risk.impact}
                </p>
                <p className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {risk.status}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── In Progress ─────────────────────────────────────────────────── */

function InProgressCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-baseline justify-between px-5">
        <CardTitle>Nu in behandeling</CardTitle>
        <a className="inline-flex items-center gap-1 text-[12px] text-primary underline-offset-4 hover:underline">
          Hele backlog <ArrowUpRight className="size-3" />
        </a>
      </CardHeader>
      <CardContent className="px-0">
        <ul className="divide-y divide-border/60">
          {inProgress.map((item) => (
            <li
              key={item.id}
              className="grid grid-cols-12 items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/30"
            >
              <span className="col-span-2 font-mono text-[11px] text-muted-foreground/80 lg:col-span-1">
                {item.id}
              </span>
              <span className="col-span-10 font-medium text-foreground lg:col-span-6">
                {item.title}
              </span>
              <span className="col-span-6 text-[13px] text-muted-foreground lg:col-span-2">
                {item.owner}
              </span>
              <span className="col-span-3 text-[12px] text-muted-foreground/80 lg:col-span-2">
                <Clock3 className="mr-1 inline size-3" /> {item.since}
              </span>
              <span className="col-span-3 lg:col-span-1">
                <Badge variant="secondary" className="text-[10.5px]">
                  {item.bucket}
                </Badge>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ─── Waiting on you ──────────────────────────────────────────────── */

function WaitingOnYouCard() {
  return (
    <Card className="ring-amber-500/20">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2">
          <CornerDownRight className="size-4 text-amber-600" />
          Wacht op jou
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        <ul className="space-y-4">
          {waitingOnYou.map((item) => (
            <li
              key={item.title}
              className="border-t border-border/60 pt-3 first:border-t-0 first:pt-0"
            >
              <p className="font-heading text-[15px] font-medium leading-snug">{item.title}</p>
              <div className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground">
                <Clock3 className="size-3" /> {item.since}
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Houdt tegen: <span className="text-foreground/90">{item.blocking}</span>
              </p>
            </li>
          ))}
        </ul>
        <button className="mt-4 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/40">
          Lever aan / reageer
        </button>
      </CardContent>
    </Card>
  );
}

/* ─── Roadmap ─────────────────────────────────────────────────────── */

function RoadmapSection() {
  const toneRing = {
    success: "ring-success/25",
    warning: "ring-amber-500/30",
    muted: "ring-border",
  } as const;
  const toneDot = {
    success: "bg-success",
    warning: "bg-amber-500",
    muted: "bg-muted-foreground/40",
  } as const;
  const toneLabel = {
    success: "text-success",
    warning: "text-amber-700",
    muted: "text-muted-foreground",
  } as const;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Roadmap — keuzes deze maand
        </h2>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Wat we doen, wat wacht, wat we bewust laten liggen
        </span>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {roadmapColumns.map((col) => (
          <Card key={col.label} className={toneRing[col.tone]}>
            <CardHeader className="px-5 pb-2">
              <div
                className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider ${toneLabel[col.tone]}`}
              >
                <span className={`inline-block size-2 rounded-full ${toneDot[col.tone]}`} />
                {col.label}
              </div>
            </CardHeader>
            <CardContent className="px-5">
              <ul className="space-y-4">
                {col.items.map((item) => (
                  <li
                    key={item.name}
                    className="border-t border-border/60 pt-3 first:border-t-0 first:pt-0"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-heading text-[15px] font-medium leading-snug">
                        {item.name}
                      </p>
                      <span className="font-mono text-[12px] text-muted-foreground">
                        {item.est}
                      </span>
                    </div>
                    {item.note && (
                      <p className="mt-1 text-[12px] italic text-muted-foreground">{item.note}</p>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ─── SLA Card ────────────────────────────────────────────────────── */

function SlaCard() {
  const rows = [
    { label: "P1 — kritiek", target: "< 2u", actual: "38m", ok: true },
    { label: "P2 — hoog", target: "< 8u", actual: "3u 14m", ok: true },
    { label: "P3 — midden", target: "< 24u", actual: "26u 12m", ok: false },
    { label: "P4 — laag", target: "< 5d", actual: "2d 4u", ok: true },
  ];
  return (
    <Card>
      <CardHeader className="flex flex-row items-baseline justify-between px-5">
        <CardTitle>SLA — april 2026</CardTitle>
        <span className="font-mono text-sm">
          <span className="text-success">9</span>
          <span className="text-muted-foreground"> / 10 geslaagd</span>
        </span>
      </CardHeader>
      <CardContent className="px-5">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((row) => (
            <div
              key={row.label}
              className={`rounded-lg border border-border/60 bg-card/40 px-4 py-3 ${
                row.ok ? "" : "ring-1 ring-amber-500/40"
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {row.label}
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-mono text-[18px] font-semibold leading-none">
                  <span className={row.ok ? "text-success" : "text-amber-600"}>{row.actual}</span>
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  doel {row.target}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-muted-foreground">
          Eén P3-overschrijding deze maand. Reden: feedback-loop met jou over ticket{" "}
          <span className="font-mono text-foreground/90">JAP-617</span> duurde 19u langer dan
          gepland. Geen patroon.
        </p>
      </CardContent>
    </Card>
  );
}

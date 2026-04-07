import {
  Building2,
  CalendarDays,
  User,
  Users,
  Clock,
  Check,
  Circle,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Send,
  Zap,
  TrendingDown,
  MessageSquareWarning,
  ShieldCheck,
  CalendarPlus,
  Mail,
} from "lucide-react";

// ─── Mock Data ───────────────────────────────────────────────

const PROJECT = {
  name: "Webshop Redesign",
  status: "in_progress",
  organization: { name: "Bakkerij Jansen", type: "client" },
  owner: "Wouter",
  contactPerson: "Jan de Vries",
  startDate: "2026-02-12",
  deadline: "2026-04-30",
};

const AI_BRIEF = {
  status: "at_risk",
  content:
    "Dit project loopt risico op de deadline van 30 april. Twee actiepunten zijn samen 10 dagen overdue, en de Dynamics-koppeling is nog niet ingepland terwijl die op het kritieke pad zit. Huidige velocity: 1.2 items/week — er staan er nog 3 open.",
  recommendation:
    "Plan deze week een call met Jan om de scope van de Dynamics-koppeling te bespreken. Overweeg om dit naar een v2 te verplaatsen zodat de go-live haalbaar blijft.",
  lastUpdated: "2026-04-04T10:00:00Z",
  sourceCount: 8,
  confidence: 0.85,
};

const AI_ALERTS = [
  {
    id: "1",
    type: "cascade_risk",
    icon: TrendingDown,
    message:
      "Wouter's design feedback (7d overdue) blokkeert Ege's betaalflow-koppeling. Cascade-vertraging van ~5 dagen als dit niet deze week opgepakt wordt.",
    action: "Stuur Wouter een herinnering",
    actionType: "send_reminder",
  },
  {
    id: "2",
    type: "sentiment",
    icon: MessageSquareWarning,
    message:
      'Klant-sentiment daalt: in de laatste 2 meetings noemde Jan "deadlines" 4x en "sneller" 2x. In eerdere meetings was de toon positiever.',
    action: "Bereid een status-update voor Jan voor",
    actionType: "draft_email",
  },
  {
    id: "3",
    type: "decision_conflict",
    icon: ShieldCheck,
    message:
      'Het besluit "Go-live voor 30 april" conflicteert met de huidige voortgang. Bij 1.2 items/week heb je nog ~2.5 weken nodig voor 3 open items — dat is 28 april, zonder buffer.',
    action: null,
    actionType: null,
  },
];

const ACTION_ITEMS = [
  {
    id: "1",
    content: "Design feedback verwerken in Figma",
    assignee: "Wouter",
    dueDate: "2026-03-28",
    status: "overdue",
    source: "Design review — 25 mrt",
    aiContext:
      "Wouter heeft sinds de deadline 3 meetings gehad maar dit item is niet besproken. Blokkeert de checkout-flow.",
  },
  {
    id: "2",
    content: "API koppeling Mollie betaalflow bouwen",
    assignee: "Ege",
    dueDate: "2026-04-01",
    status: "overdue",
    source: "Sprint planning — 20 mrt",
    aiContext: "Wacht op Wouter's design feedback. Kan pas starten na afronding item hierboven.",
  },
  {
    id: "3",
    content: "Testplan schrijven voor checkout flow",
    assignee: "Stef",
    dueDate: "2026-04-15",
    status: "open",
    source: "Status update — 1 apr",
    aiContext: null,
  },
  {
    id: "4",
    content: "Wireframes homepage goedkeuren",
    assignee: "Jan de Vries",
    dueDate: "2026-03-20",
    status: "done",
    source: "Discovery — 14 feb",
    aiContext: null,
  },
  {
    id: "5",
    content: "Shopify development store opzetten",
    assignee: "Ege",
    dueDate: "2026-03-10",
    status: "done",
    source: "Kickoff — 18 feb",
    aiContext: null,
  },
];

const DECISIONS = [
  {
    id: "1",
    content: "Shopify als e-commerce platform",
    date: "2026-02-14",
    madeBy: "Jan de Vries, Wouter",
    context: "Klant wil geen eigen hosting beheren. Shopify past bij budget en schaal.",
    source: "Discovery meeting",
    aiStatus: "valid",
    aiNote: null,
  },
  {
    id: "2",
    content: "Mollie voor betalingen (iDEAL + creditcard)",
    date: "2026-02-21",
    madeBy: "Ege, Jan de Vries",
    context: "Mollie goedkoper dan Adyen voor dit volume. Goede Shopify-integratie.",
    source: "Technical review",
    aiStatus: "stale",
    aiNote:
      "6 weken oud, API-koppeling nog niet gestart. Risico: Mollie API-versie kan verouderd zijn.",
  },
  {
    id: "3",
    content: "Mobile-first design approach",
    date: "2026-02-14",
    madeBy: "Wouter",
    context: "70% van het verkeer komt via mobiel. Desktop als afgeleide.",
    source: "Discovery meeting",
    aiStatus: "valid",
    aiNote: null,
  },
  {
    id: "4",
    content: "Go-live vóór 30 april (Q2 start)",
    date: "2026-03-01",
    madeBy: "Jan de Vries, Stef",
    context: "Klant wil voor zomerseizoen live. Contractueel vastgelegd.",
    source: "Status update",
    aiStatus: "at_risk",
    aiNote: "Huidige velocity maakt dit krap. 3 open items, 26 dagen tot deadline, geen buffer.",
  },
];

const NEEDS = [
  {
    id: "1",
    content: "Koppeling met bestaand voorraadsysteem (Microsoft Dynamics)",
    source: "Status update — 1 apr",
    aiSuggestion:
      "2 meetings genoemd, geen actiepunt aangemaakt. Geschatte effort: 20-30 uur. Overweeg v2-scope.",
    aiAction: "Maak actiepunt aan",
  },
  {
    id: "2",
    content: "GDPR-compliance advies voor checkout met adresgegevens",
    source: "Design review — 25 mrt",
    aiSuggestion:
      "Standaard-advies op basis van vergelijkbare projecten: 8-16 uur. Kan extern uitbesteed worden.",
    aiAction: "Draft voorstel voor Jan",
  },
];

const MEETINGS = [
  {
    id: "1",
    title: "Wekelijkse status update",
    date: "2026-04-01",
    type: "status_update",
    participants: ["Wouter", "Jan de Vries"],
  },
  {
    id: "2",
    title: "Design review homepage + checkout",
    date: "2026-03-25",
    type: "review",
    participants: ["Ege", "Jan de Vries", "Piet Bakker"],
  },
  {
    id: "3",
    title: "Sprint planning week 13",
    date: "2026-03-20",
    type: "internal_sync",
    participants: ["Stef", "Wouter", "Ege"],
  },
  {
    id: "4",
    title: "Technical review betaalflow",
    date: "2026-02-21",
    type: "review",
    participants: ["Ege", "Jan de Vries"],
  },
  {
    id: "5",
    title: "Discovery: requirements & scope",
    date: "2026-02-14",
    type: "discovery",
    participants: ["Stef", "Wouter", "Jan de Vries"],
  },
];

const SUGGESTED_PROMPTS = [
  { label: "Bereid de volgende meeting met Jan voor", icon: CalendarPlus },
  { label: "Schrijf een status-update email voor de klant", icon: Mail },
  { label: "Wat gebeurt er als we Dynamics uit scope halen?", icon: Zap },
];

// ─── Helpers ─────────────────────────────────────────────────

function daysUntil(dateStr: string) {
  const now = new Date("2026-04-04");
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function daysOverdue(dateStr: string) {
  const days = -daysUntil(dateStr);
  return days > 0 ? days : 0;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

// ─── Status Pipeline ─────────────────────────────────────────

const DELIVERY_STEPS = ["kickoff", "in_progress", "review", "completed"] as const;
const STEP_LABELS: Record<string, string> = {
  kickoff: "Kickoff",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
};

function StatusPipeline({ status }: { status: string }) {
  const currentIndex = DELIVERY_STEPS.indexOf(status as (typeof DELIVERY_STEPS)[number]);
  return (
    <div className="flex items-center gap-1">
      {DELIVERY_STEPS.map((step, i) => {
        const isCurrent = step === status;
        const isPast = i < currentIndex;
        let className = "rounded-full px-3 py-1 text-xs font-medium ";
        if (isCurrent) className += "bg-[#006B3F] text-white";
        else if (isPast) className += "bg-[#006B3F]/15 text-[#006B3F]";
        else className += "bg-muted text-muted-foreground/50";
        return (
          <span key={step} className={className}>
            {STEP_LABELS[step]}
          </span>
        );
      })}
    </div>
  );
}

// ─── Meeting Type ────────────────────────────────────────────

const MEETING_TYPE_LABELS: Record<string, string> = {
  status_update: "Status",
  review: "Review",
  internal_sync: "Internal",
  discovery: "Discovery",
};

// ─── Page ────────────────────────────────────────────────────

export default function TestProject2Page() {
  const daysLeft = daysUntil(PROJECT.deadline);
  const overdueCount = ACTION_ITEMS.filter((a) => a.status === "overdue").length;
  const openCount = ACTION_ITEMS.filter((a) => a.status === "open").length;
  const doneCount = ACTION_ITEMS.filter((a) => a.status === "done").length;

  return (
    <div className="px-4 py-8">
      {/* ── Header ── */}
      <div className="mb-8">
        <p className="text-xs font-medium tracking-wide text-muted-foreground/60 uppercase">
          {PROJECT.organization.name}
        </p>
        <h1 className="mt-1 text-[#006B3F]">{PROJECT.name}</h1>
        <div className="mt-3">
          <StatusPipeline status={PROJECT.status} />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            {PROJECT.owner}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {PROJECT.contactPerson}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(PROJECT.startDate)} — {formatDate(PROJECT.deadline)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {daysLeft}d tot deadline
          </span>
        </div>
      </div>

      {/* ── AI Brief: Forward-looking ── */}
      <section className="mb-6 rounded-lg bg-[#006B3F]/[0.04] px-5 py-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-[#006B3F]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
            AI Briefing
          </h3>
          <span className="ml-auto text-[10px] text-muted-foreground/55">
            {AI_BRIEF.sourceCount} meetings geanalyseerd
          </span>
        </div>

        <p className="text-[15px] leading-relaxed text-foreground/85">{AI_BRIEF.content}</p>

        <div className="mt-4 rounded-md bg-[#006B3F]/[0.06] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70 mb-1">
            Aanbeveling
          </p>
          <p className="text-sm leading-relaxed text-foreground/80">{AI_BRIEF.recommendation}</p>
        </div>
      </section>

      {/* ── AI Alerts: What needs attention ── */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70 mb-3 px-1">
          Aandachtspunten
        </h3>
        <div className="space-y-2">
          {AI_ALERTS.map((alert) => {
            const Icon = alert.icon;
            return (
              <div key={alert.id} className="rounded-lg border border-border/30 px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#006B3F]/60" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed text-foreground/80">{alert.message}</p>
                    {alert.action && (
                      <button className="mt-2.5 flex items-center gap-1.5 rounded-md bg-[#006B3F]/[0.07] px-3 py-1.5 text-xs font-medium text-[#006B3F] transition-colors hover:bg-[#006B3F]/[0.12]">
                        <ArrowRight className="h-3 w-3" />
                        {alert.action}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Bedrijfsprofiel (collapsed) ── */}
      <section className="mb-8 rounded-lg bg-muted/40 px-5 py-4">
        <details className="group">
          <summary className="flex cursor-pointer items-center gap-2.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground/55" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
              {PROJECT.organization.name}
            </span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/55 transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-3 pl-6">
            <p className="text-[15px] leading-relaxed text-foreground/85">
              Middelgrote bakkerijketen (12 vestigingen) in Noord-Holland. Klant sinds januari 2026.
              Contactpersoon is Jan de Vries (directeur). Pragmatisch ingesteld, beslist snel. Twee
              lopende projecten. Relatie is goed, klant geeft actief feedback.
            </p>
          </div>
        </details>
      </section>

      {/* ── Actiepunten with AI context ── */}
      <section className="mb-6 rounded-lg border border-border/30 px-5 py-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
            Actiepunten
          </h3>
          <div className="flex gap-3 text-xs text-muted-foreground/65 tabular-nums">
            {overdueCount > 0 && <span className="text-foreground/60">{overdueCount} overdue</span>}
            <span>{openCount} open</span>
            <span>{doneCount} af</span>
          </div>
        </div>

        <div className="space-y-2">
          {ACTION_ITEMS.filter((a) => a.status !== "done").map((item) => (
            <div key={item.id} className="rounded-md bg-muted/30 px-3 py-3">
              <div className="flex items-start gap-3">
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{item.content}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground/65">
                    <span>{item.assignee}</span>
                    <span>&middot;</span>
                    {item.status === "overdue" ? (
                      <span className="font-medium text-[#006B3F]">
                        {daysOverdue(item.dueDate)}d overdue
                      </span>
                    ) : (
                      <span>{formatDateShort(item.dueDate)}</span>
                    )}
                    <span>&middot;</span>
                    <span>{item.source}</span>
                  </div>

                  {/* AI context */}
                  {item.aiContext && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-foreground/55">
                      <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[#006B3F]/50" />
                      <span>{item.aiContext}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Done items */}
        {doneCount > 0 && (
          <details className="group mt-2">
            <summary className="flex cursor-pointer items-center gap-1 py-2 text-xs text-muted-foreground/55 hover:text-muted-foreground/70">
              <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
              {doneCount} afgerond
            </summary>
            <div className="mt-1 space-y-1">
              {ACTION_ITEMS.filter((a) => a.status === "done").map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-md px-3 py-2.5 opacity-40"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-through">{item.content}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{item.assignee}</span>
                      <span>&middot;</span>
                      <span>{formatDateShort(item.dueDate)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      {/* ── Besluiten with AI validation ── */}
      <section className="mb-6 rounded-lg border border-border/30 px-5 py-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
            Besluiten
          </h3>
          <span className="text-xs text-muted-foreground/55 tabular-nums">{DECISIONS.length}</span>
        </div>

        <div className="space-y-2">
          {DECISIONS.map((decision) => (
            <div
              key={decision.id}
              className="rounded-md bg-muted/30 px-3 py-3 border-l-2 border-[#006B3F]/20"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{decision.content}</p>
                {decision.aiStatus === "at_risk" && (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#006B3F]/60" />
                )}
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground/65">{decision.context}</p>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground/55">
                <span className="tabular-nums">{formatDateShort(decision.date)}</span>
                <span>&middot;</span>
                <span>{decision.madeBy}</span>
                <span>&middot;</span>
                <span>{decision.source}</span>
              </div>

              {/* AI validation note */}
              {decision.aiNote && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-foreground/55">
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[#006B3F]/50" />
                  <span>{decision.aiNote}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Needs with AI suggestions ── */}
      <section className="mb-6 rounded-lg border border-border/30 px-5 py-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
            Open behoeften
          </h3>
          <span className="text-xs text-muted-foreground/55 tabular-nums">{NEEDS.length} open</span>
        </div>

        <div className="space-y-2">
          {NEEDS.map((need) => (
            <div key={need.id} className="rounded-md bg-muted/30 px-3 py-3">
              <p className="text-sm">{need.content}</p>
              <p className="mt-1 text-xs text-muted-foreground/55">{need.source}</p>

              {/* AI suggestion + action */}
              <div className="mt-2 flex items-start gap-1.5 text-xs text-foreground/55">
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[#006B3F]/50" />
                <div>
                  <span>{need.aiSuggestion}</span>
                  <button className="mt-1.5 flex items-center gap-1 rounded-md bg-[#006B3F]/[0.07] px-2.5 py-1 text-xs font-medium text-[#006B3F] transition-colors hover:bg-[#006B3F]/[0.12]">
                    <ArrowRight className="h-3 w-3" />
                    {need.aiAction}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Meetings ── */}
      <section className="mb-8 rounded-lg border border-border/30 px-5 py-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
            Meetings
          </h3>
          <span className="text-xs text-muted-foreground/55 tabular-nums">{MEETINGS.length}</span>
        </div>

        <div className="space-y-2">
          {MEETINGS.map((meeting) => (
            <div
              key={meeting.id}
              className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm">{meeting.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground/55">
                  {meeting.participants.join(", ")}
                </p>
              </div>
              <div className="ml-4 flex items-center gap-3 text-xs text-muted-foreground/65 shrink-0">
                <span>{MEETING_TYPE_LABELS[meeting.type] ?? meeting.type}</span>
                <span className="tabular-nums">{formatDateShort(meeting.date)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Interaction Layer ── */}
      <section className="mb-6">
        <div className="rounded-lg border border-[#006B3F]/20 bg-[#006B3F]/[0.02] px-5 py-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70 mb-3">
            Vraag iets over dit project
          </h3>

          {/* Suggested prompts */}
          <div className="space-y-1.5 mb-4">
            {SUGGESTED_PROMPTS.map((prompt) => {
              const Icon = prompt.icon;
              return (
                <button
                  key={prompt.label}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm text-foreground/70 transition-colors hover:bg-[#006B3F]/[0.06]"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[#006B3F]/50" />
                  {prompt.label}
                </button>
              );
            })}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 rounded-md border border-border/40 bg-white px-3 py-2.5">
            <input
              type="text"
              placeholder="Stel een vraag of geef een opdracht..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
              disabled
            />
            <Send className="h-4 w-4 text-muted-foreground/30" />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <p className="text-center text-[10px] text-muted-foreground/30">
        Prototype v2 — AI-first concept met mock data
      </p>
    </div>
  );
}

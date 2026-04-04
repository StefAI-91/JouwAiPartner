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
  summary: {
    content:
      "Herontwerp van de bestaande webshop met focus op mobiele ervaring en checkout-flow. Klant wil voor Q2 live. Shopify gekozen als platform, Mollie voor betalingen. Design-fase is afgerond, development loopt. Twee open risico's: koppeling met bestaand voorraadsysteem en GDPR-compliance van de checkout. Klant is tevreden over voortgang maar wil snellere communicatie over deadlines.",
    lastUpdated: "2026-04-01T14:30:00Z",
    sourceCount: 8,
  },
  orgSummary: {
    content:
      "Middelgrote bakkerijketen (12 vestigingen) in Noord-Holland. Klant sinds januari 2026. Contactpersoon is Jan de Vries (directeur). Pragmatisch ingesteld, beslist snel. Twee lopende projecten: webshop redesign en intern bestelsysteem. Relatie is goed, klant geeft actief feedback.",
    lastUpdated: "2026-04-01T14:30:00Z",
  },
};

const ACTION_ITEMS = [
  {
    id: "1",
    content: "Design feedback verwerken in Figma",
    assignee: "Wouter",
    dueDate: "2026-03-28",
    status: "overdue",
    source: "Design review — 25 mrt",
  },
  {
    id: "2",
    content: "API koppeling Mollie betaalflow bouwen",
    assignee: "Ege",
    dueDate: "2026-04-01",
    status: "overdue",
    source: "Sprint planning — 20 mrt",
  },
  {
    id: "3",
    content: "Testplan schrijven voor checkout flow",
    assignee: "Stef",
    dueDate: "2026-04-15",
    status: "open",
    source: "Status update — 1 apr",
  },
  {
    id: "4",
    content: "Wireframes homepage goedkeuren",
    assignee: "Jan de Vries",
    dueDate: "2026-03-20",
    status: "done",
    source: "Discovery — 14 feb",
  },
  {
    id: "5",
    content: "Shopify development store opzetten",
    assignee: "Ege",
    dueDate: "2026-03-10",
    status: "done",
    source: "Kickoff — 18 feb",
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
  },
  {
    id: "2",
    content: "Mollie voor betalingen (iDEAL + creditcard)",
    date: "2026-02-21",
    madeBy: "Ege, Jan de Vries",
    context: "Mollie goedkoper dan Adyen voor dit volume. Goede Shopify-integratie.",
    source: "Technical review",
  },
  {
    id: "3",
    content: "Mobile-first design approach",
    date: "2026-02-14",
    madeBy: "Wouter",
    context: "70% van het verkeer komt via mobiel. Desktop als afgeleide.",
    source: "Discovery meeting",
  },
  {
    id: "4",
    content: "Go-live vóór 30 april (Q2 start)",
    date: "2026-03-01",
    madeBy: "Jan de Vries, Stef",
    context: "Klant wil voor zomerseizoen live. Contractueel vastgelegd.",
    source: "Status update",
  },
];

const NEEDS = [
  {
    id: "1",
    content: "Koppeling met bestaand voorraadsysteem (Microsoft Dynamics)",
    status: "open",
    source: "Status update — 1 apr",
  },
  {
    id: "2",
    content: "GDPR-compliance advies voor checkout met adresgegevens",
    status: "open",
    source: "Design review — 25 mrt",
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
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

function timeAgo(dateStr: string) {
  const now = new Date("2026-04-04T16:00:00Z");
  const date = new Date(dateStr);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "vandaag";
  if (diffDays === 1) return "gisteren";
  return `${diffDays} dagen geleden`;
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

        let className = "rounded-full px-3 py-1 text-xs font-medium transition-colors ";
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
  sales: "Sales",
};

// ─── Page ────────────────────────────────────────────────────

export default function TestProjectPage() {
  const daysLeft = daysUntil(PROJECT.deadline);
  const overdueCount = ACTION_ITEMS.filter((a) => a.status === "overdue").length;
  const openCount = ACTION_ITEMS.filter((a) => a.status === "open").length;
  const doneCount = ACTION_ITEMS.filter((a) => a.status === "done").length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* ── Header ── */}
      <div className="mb-10">
        <p className="text-xs font-medium tracking-wide text-muted-foreground/60 uppercase">
          {PROJECT.organization.name}
        </p>

        <h1 className="mt-1 text-[#006B3F]">{PROJECT.name}</h1>

        <div className="mt-3">
          <StatusPipeline status={PROJECT.status} />
        </div>

        {/* Meta */}
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
          <span
            className={`flex items-center gap-1.5 ${daysLeft < 14 ? "text-foreground/70" : ""}`}
          >
            <Clock className="h-3.5 w-3.5" />
            {daysLeft > 0 ? `${daysLeft}d tot deadline` : "Deadline verstreken"}
          </span>
        </div>
      </div>

      {/* ── AI Project Summary ── */}
      <section className="mb-6 rounded-lg bg-[#006B3F]/[0.03] px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-[#006B3F]/60" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
            Project Summary
          </h3>
          <span className="text-[10px] text-muted-foreground/40">
            {timeAgo(PROJECT.summary.lastUpdated)} &middot; {PROJECT.summary.sourceCount} meetings
          </span>
        </div>
        <p className="text-[15px] leading-relaxed text-foreground/75">{PROJECT.summary.content}</p>
      </section>

      {/* ── Bedrijfsprofiel (collapsed) ── */}
      <section className="mb-8 rounded-lg bg-muted/40 px-5 py-4">
        <details className="group">
          <summary className="flex cursor-pointer items-center gap-2.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
              {PROJECT.organization.name}
            </span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/40 transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-3 pl-6">
            <p className="text-[15px] leading-relaxed text-foreground/75">
              {PROJECT.orgSummary.content}
            </p>
            <p className="mt-2 text-[10px] text-muted-foreground/40">
              Bijgewerkt {timeAgo(PROJECT.orgSummary.lastUpdated)}
            </p>
          </div>
        </details>
      </section>

      {/* ── Actiepunten ── */}
      <section className="mb-6 rounded-lg border border-border/30 px-5 py-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
            Actiepunten
          </h3>
          <div className="flex gap-3 text-xs text-muted-foreground/50 tabular-nums">
            {overdueCount > 0 && <span className="text-foreground/60">{overdueCount} overdue</span>}
            <span>{openCount} open</span>
            <span>{doneCount} af</span>
          </div>
        </div>

        <div className="divide-y divide-border/40">
          {ACTION_ITEMS.filter((a) => a.status !== "done").map((item) => (
            <div key={item.id} className="flex items-start gap-3 py-3">
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/25" />
              <div className="flex-1 min-w-0">
                <p className="text-sm">{item.content}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground/50">
                  <span>{item.assignee}</span>
                  <span>&middot;</span>
                  {item.status === "overdue" ? (
                    <span className="text-foreground/60">{daysOverdue(item.dueDate)}d overdue</span>
                  ) : (
                    <span>{formatDateShort(item.dueDate)}</span>
                  )}
                  <span>&middot;</span>
                  <span>{item.source}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Done items */}
        {doneCount > 0 && (
          <details className="group mt-1">
            <summary className="flex cursor-pointer items-center gap-1 py-2 text-xs text-muted-foreground/40 hover:text-muted-foreground/60">
              <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
              {doneCount} afgerond
            </summary>
            <div className="divide-y divide-border/30">
              {ACTION_ITEMS.filter((a) => a.status === "done").map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-3 opacity-40">
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

      {/* ── Besluiten ── */}
      <section className="mb-6 rounded-lg border border-border/30 px-5 py-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
            Besluiten
          </h3>
          <span className="text-xs text-muted-foreground/40 tabular-nums">{DECISIONS.length}</span>
        </div>

        <div className="divide-y divide-border/40">
          {DECISIONS.map((decision) => (
            <div key={decision.id} className="py-3">
              <p className="text-sm font-medium">{decision.content}</p>
              <p className="mt-1 text-[13px] text-muted-foreground/50">{decision.context}</p>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground/40">
                <span className="tabular-nums">{formatDateShort(decision.date)}</span>
                <span>&middot;</span>
                <span>{decision.madeBy}</span>
                <span>&middot;</span>
                <span>{decision.source}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Open behoeften ── */}
      {NEEDS.length > 0 && (
        <section className="mb-6 rounded-lg border border-border/30 px-5 py-4">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
              Open behoeften
            </h3>
            <span className="text-xs text-muted-foreground/40 tabular-nums">
              {NEEDS.length} open
            </span>
          </div>

          <div className="divide-y divide-border/40">
            {NEEDS.map((need) => (
              <div key={need.id} className="py-3">
                <p className="text-sm">{need.content}</p>
                <p className="mt-1 text-xs text-muted-foreground/40">{need.source}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Meetings ── */}
      <section className="mb-6 rounded-lg border border-border/30 px-5 py-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
            Meetings
          </h3>
          <span className="text-xs text-muted-foreground/40 tabular-nums">{MEETINGS.length}</span>
        </div>

        <div className="divide-y divide-border/40">
          {MEETINGS.map((meeting) => (
            <div key={meeting.id} className="flex items-center justify-between py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm">{meeting.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground/40">
                  {meeting.participants.join(", ")}
                </p>
              </div>
              <div className="ml-4 flex items-center gap-3 text-xs text-muted-foreground/50 shrink-0">
                <span>{MEETING_TYPE_LABELS[meeting.type] ?? meeting.type}</span>
                <span className="tabular-nums">{formatDateShort(meeting.date)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <p className="text-center text-[10px] text-muted-foreground/30">
        Prototype — mock data voor design review
      </p>
    </div>
  );
}

import {
  Building2,
  CalendarDays,
  User,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Target,
  FileText,
  TrendingUp,
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
    verified: true,
  },
  {
    id: "2",
    title: "Design review homepage + checkout",
    date: "2026-03-25",
    type: "review",
    participants: ["Ege", "Jan de Vries", "Piet Bakker"],
    verified: true,
  },
  {
    id: "3",
    title: "Sprint planning week 13",
    date: "2026-03-20",
    type: "internal_sync",
    participants: ["Stef", "Wouter", "Ege"],
    verified: true,
  },
  {
    id: "4",
    title: "Technical review betaalflow",
    date: "2026-02-21",
    type: "review",
    participants: ["Ege", "Jan de Vries"],
    verified: true,
  },
  {
    id: "5",
    title: "Discovery: requirements & scope",
    date: "2026-02-14",
    type: "discovery",
    participants: ["Stef", "Wouter", "Jan de Vries"],
    verified: true,
  },
];

// ─── Helpers ─────────────────────────────────────────────────

function daysUntil(dateStr: string) {
  const now = new Date("2026-04-04"); // mock "today"
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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

// ─── Meeting Type Badge ──────────────────────────────────────

const MEETING_TYPE_COLORS: Record<string, string> = {
  status_update: "bg-blue-100 text-blue-700",
  review: "bg-purple-100 text-purple-700",
  internal_sync: "bg-gray-100 text-gray-700",
  discovery: "bg-amber-100 text-amber-700",
  sales: "bg-emerald-100 text-emerald-700",
};

const MEETING_TYPE_LABELS: Record<string, string> = {
  status_update: "Status Update",
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
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
          <span className="font-medium">{PROJECT.organization.name}</span>
          <ChevronRight className="h-3 w-3" />
          <span>Project</span>
        </div>

        <h1 className="mt-2">{PROJECT.name}</h1>

        <div className="mt-3">
          <StatusPipeline status={PROJECT.status} />
        </div>

        {/* Meta row */}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">{PROJECT.owner}</span>
            <span className="text-xs">(eigenaar)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">{PROJECT.contactPerson}</span>
            <span className="text-xs">(klant)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(PROJECT.startDate)} — {formatDate(PROJECT.deadline)}
          </span>
          <span
            className={`flex items-center gap-1.5 font-medium ${daysLeft < 14 ? "text-amber-600" : "text-muted-foreground"}`}
          >
            <Clock className="h-3.5 w-3.5" />
            {daysLeft > 0 ? `${daysLeft} dagen tot deadline` : "Deadline verstreken!"}
          </span>
        </div>
      </div>

      {/* ── AI Project Summary ── */}
      <section className="mb-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#006B3F]/10">
                <Sparkles className="h-4 w-4 text-[#006B3F]" />
              </div>
              <h3 className="text-sm font-semibold">Project Summary</h3>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Bijgewerkt {timeAgo(PROJECT.summary.lastUpdated)} &middot;{" "}
              {PROJECT.summary.sourceCount} meetings
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/80">{PROJECT.summary.content}</p>
        </div>
      </section>

      {/* ── Bedrijf Summary (collapsed) ── */}
      <section className="mb-6">
        <details className="group">
          <summary className="flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">{PROJECT.organization.name}</h3>
              <p className="text-xs text-muted-foreground">
                Bedrijfsprofiel &middot; AI-samenvatting
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-1 rounded-b-2xl bg-white px-5 pb-5 pt-2 shadow-sm">
            <p className="text-sm leading-relaxed text-foreground/80">
              {PROJECT.orgSummary.content}
            </p>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Bijgewerkt {timeAgo(PROJECT.orgSummary.lastUpdated)}
            </p>
          </div>
        </details>
      </section>

      {/* ── Actiepunten ── */}
      <section className="mb-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
                <Target className="h-4 w-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-semibold">Actiepunten</h3>
            </div>
            <div className="flex gap-2 text-xs">
              {overdueCount > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">
                  {overdueCount} overdue
                </span>
              )}
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                {openCount} open
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                {doneCount} afgerond
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {ACTION_ITEMS.filter((a) => a.status !== "done").map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 rounded-xl px-3 py-3 ${
                  item.status === "overdue" ? "bg-red-50/60" : "bg-muted/30"
                }`}
              >
                {item.status === "overdue" ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.content}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-white px-2 py-0.5 shadow-sm">
                      {item.assignee}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        item.status === "overdue"
                          ? "bg-red-100 text-red-600 font-medium"
                          : "bg-white shadow-sm"
                      }`}
                    >
                      {formatDateShort(item.dueDate)}
                    </span>
                    <span className="text-muted-foreground/50">{item.source}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Done items collapsed */}
            {doneCount > 0 && (
              <details className="group">
                <summary className="mt-2 flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                  {doneCount} afgeronde actiepunten
                </summary>
                <div className="mt-2 space-y-2">
                  {ACTION_ITEMS.filter((a) => a.status === "done").map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-xl bg-muted/20 px-3 py-3 opacity-60"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-through">{item.content}</p>
                        <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                          <span>{item.assignee}</span>
                          <span>{formatDateShort(item.dueDate)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      </section>

      {/* ── Besluiten ── */}
      <section className="mb-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold">Besluiten</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {DECISIONS.length}
            </span>
          </div>

          <div className="space-y-3">
            {DECISIONS.map((decision) => (
              <div
                key={decision.id}
                className="rounded-xl bg-muted/30 px-4 py-3"
                style={{ borderLeft: "3px solid #3B82F6" }}
              >
                <p className="text-sm font-medium">{decision.content}</p>
                <p className="mt-1 text-xs text-muted-foreground/70">{decision.context}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  <span>{formatDateShort(decision.date)}</span>
                  <span>&middot;</span>
                  <span>{decision.madeBy}</span>
                  <span>&middot;</span>
                  <span>{decision.source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Open Behoeften ── */}
      {NEEDS.length > 0 && (
        <section className="mb-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <h3 className="text-sm font-semibold">Open behoeften</h3>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                {NEEDS.length} open
              </span>
            </div>

            <div className="space-y-2">
              {NEEDS.map((need) => (
                <div
                  key={need.id}
                  className="rounded-xl bg-purple-50/50 px-4 py-3"
                  style={{ borderLeft: "3px solid #A855F7" }}
                >
                  <p className="text-sm">{need.content}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{need.source}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Meetings ── */}
      <section className="mb-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
              <MessageSquare className="h-4 w-4 text-gray-600" />
            </div>
            <h3 className="text-sm font-semibold">Meetings</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {MEETINGS.length}
            </span>
          </div>

          <div className="space-y-2">
            {MEETINGS.map((meeting) => (
              <div
                key={meeting.id}
                className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{meeting.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDateShort(meeting.date)}</span>
                    <span>&middot;</span>
                    <span>{meeting.participants.join(", ")}</span>
                  </div>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      MEETING_TYPE_COLORS[meeting.type] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {MEETING_TYPE_LABELS[meeting.type] ?? meeting.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer note ── */}
      <p className="text-center text-xs text-muted-foreground/50">
        Prototype — alle data is mock data voor design review
      </p>
    </div>
  );
}

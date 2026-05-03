// ── Raw values (voor Zod schemas en database checks) ──

/**
 * Sentinel value voor `assignedTo`-filter dat "niet toegewezen" representeert.
 * Leeft in constants (geen server-deps) zodat client components hem kunnen
 * importeren zonder het hele queries-pad mee te bundelen.
 */
export const UNASSIGNED_SENTINEL = "unassigned";

export const ISSUE_TYPES = ["bug", "feature_request", "question"] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

export const ISSUE_STATUSES = [
  "triage",
  "backlog",
  "todo",
  "in_progress",
  "done",
  "cancelled",
] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_PRIORITIES = ["urgent", "high", "medium", "low"] as const;
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const ISSUE_COMPONENTS = [
  "frontend",
  "backend",
  "api",
  "database",
  "prompt_ai",
  "unknown",
] as const;
export type IssueComponent = (typeof ISSUE_COMPONENTS)[number];

export const ISSUE_SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const CLOSED_STATUSES = new Set<IssueStatus>(["done", "cancelled"]);

// ── Labels voor UI (voor dropdowns en badges) ──

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  bug: "Bug",
  feature_request: "Functionaliteit",
  question: "Vraag",
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  triage: "Triage",
  backlog: "Backlog",
  todo: "Te doen",
  in_progress: "In behandeling",
  done: "Afgerond",
  cancelled: "Geannuleerd",
};

export const ISSUE_PRIORITY_LABELS: Record<IssuePriority, string> = {
  urgent: "P0 — Kritiek",
  high: "P1 — Urgent",
  medium: "P2 — Normaal",
  low: "P3 — Nice-to-have",
};

export const ISSUE_PRIORITY_SHORT_LABELS: Record<IssuePriority, string> = {
  urgent: "P0",
  high: "P1",
  medium: "P2",
  low: "P3",
};

export function getPriorityShortLabel(priority: string): string {
  return (
    ISSUE_PRIORITY_SHORT_LABELS[priority as IssuePriority] ?? priority.toUpperCase().slice(0, 3)
  );
}

export const ISSUE_COMPONENT_LABELS: Record<IssueComponent, string> = {
  frontend: "Frontend",
  backend: "Backend",
  api: "API",
  database: "Database",
  prompt_ai: "Prompt / AI",
  unknown: "Onbekend",
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  critical: "Kritiek",
  high: "Hoog",
  medium: "Gemiddeld",
  low: "Laag",
};

// ── Priority sort order (voor queries en client-side sorting) ──

export const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// ── Portal-specifieke statusgroepen ──
//
// Klanten zien geen interne DevHub workflow (triage/backlog/...) maar vier
// grovere buckets. Dit is de bron van waarheid voor zowel de vertaling (portal
// UI), het filter (portal queries) als de metric-aggregatie. Wijzig alleen
// hier — label, key en bijbehorende interne statussen blijven in sync.

export const PORTAL_STATUS_GROUPS = [
  {
    key: "ontvangen",
    label: "Ontvangen",
    internalStatuses: ["triage"],
  },
  {
    key: "ingepland",
    label: "Ingepland",
    internalStatuses: ["backlog", "todo"],
  },
  {
    key: "in_behandeling",
    label: "In behandeling",
    internalStatuses: ["in_progress"],
  },
  {
    key: "afgerond",
    label: "Afgerond",
    internalStatuses: ["done", "cancelled"],
  },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  internalStatuses: IssueStatus[];
}>;

export type PortalStatusKey = (typeof PORTAL_STATUS_GROUPS)[number]["key"];
export type PortalStatusLabel = (typeof PORTAL_STATUS_GROUPS)[number]["label"];

/**
 * Interne status → portal-groep key. Afgeleid van `PORTAL_STATUS_GROUPS`.
 */
export const INTERNAL_STATUS_TO_PORTAL_KEY: Record<IssueStatus, PortalStatusKey> =
  PORTAL_STATUS_GROUPS.reduce(
    (acc, group) => {
      for (const status of group.internalStatuses) {
        acc[status] = group.key;
      }
      return acc;
    },
    {} as Record<IssueStatus, PortalStatusKey>,
  );

/**
 * Portal-groep key → interne statussen die erin vallen. Afgeleid.
 */
export const PORTAL_KEY_TO_INTERNAL_STATUSES: Record<PortalStatusKey, IssueStatus[]> =
  PORTAL_STATUS_GROUPS.reduce(
    (acc, group) => {
      acc[group.key] = [...group.internalStatuses];
      return acc;
    },
    {} as Record<PortalStatusKey, IssueStatus[]>,
  );

/**
 * Portal-groep key → klantlabel.
 */
export const PORTAL_STATUS_LABELS: Record<PortalStatusKey, PortalStatusLabel> =
  PORTAL_STATUS_GROUPS.reduce(
    (acc, group) => {
      acc[group.key] = group.label;
      return acc;
    },
    {} as Record<PortalStatusKey, PortalStatusLabel>,
  );

// ── Portal-specifieke source-groepering ──
//
// Het portal toont issues niet per ruwe `source` maar in drie buckets:
//   - portal_pm  → wat de klant-PM zelf indient via het portal-formulier
//   - end_users  → wat eindgebruikers indienen via embedded widgets
//                  (Userback óf JAIP-widget op de client-app)
//   - jaip       → wat JAIP intern aanmaakt (handmatig of door AI)
//
// De PM ziet onder "Mijn feedback" alleen `portal_pm`; eindgebruiker-feedback
// landt via topic-curatie in de Roadmap, niet als ruwe ticket-stroom.
//
// `jaip_widget` (WG-004) hoort bij `end_users`: dezelfde mentale categorie
// als userback (embedded feedback-knop op de client-app, niet door de PM
// zelf ingediend). Zonder deze mapping zou widget-feedback default op
// 'jaip' vallen — verkeerde bucket voor eindgebruiker-feedback.

export const PORTAL_SOURCE_GROUPS = [
  { key: "portal_pm", label: "Mijn meldingen", sources: ["portal"] },
  { key: "end_users", label: "Van gebruikers", sources: ["userback", "jaip_widget"] },
  { key: "jaip", label: "JAIP-meldingen", sources: ["manual", "ai"] },
] as const;

export type PortalSourceGroupKey = (typeof PORTAL_SOURCE_GROUPS)[number]["key"];

/**
 * Map een ruwe issue `source` naar de portal-groep. Onbekende, lege of
 * `null`/`undefined` sources vallen terug op `'jaip'` — beter "intern" tonen
 * dan iets aan de klant labelen dat hij niet herkent. Pure functie zonder
 * DB-call zodat zowel UI als query-laag hem kan gebruiken.
 */
export function resolvePortalSourceGroup(source: string | null | undefined): PortalSourceGroupKey {
  if (!source) return "jaip";
  for (const group of PORTAL_SOURCE_GROUPS) {
    if ((group.sources as readonly string[]).includes(source)) {
      return group.key;
    }
  }
  return "jaip";
}

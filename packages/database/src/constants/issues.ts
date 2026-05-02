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
  "needs_pm_review",
  "triage",
  "backlog",
  "todo",
  "in_progress",
  "done",
  "cancelled",
  "declined",
  "deferred",
  "converted_to_qa",
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

// `declined` en `converted_to_qa` zijn dood-end statussen (klant ziet
// eind-verklaring resp. de issue is omgezet naar een vraag). `deferred`
// blijft expliciet buiten de set: parked items kunnen terug naar
// needs_pm_review en mogen niet als "closed" geteld worden.
export const CLOSED_STATUSES = new Set<IssueStatus>([
  "done",
  "cancelled",
  "declined",
  "converted_to_qa",
]);

// ── Labels voor UI (voor dropdowns en badges) ──

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  bug: "Bug",
  feature_request: "Functionaliteit",
  question: "Vraag",
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  needs_pm_review: "Wacht op PM-review",
  triage: "Triage",
  backlog: "Backlog",
  todo: "Te doen",
  in_progress: "In behandeling",
  done: "Afgerond",
  cancelled: "Geannuleerd",
  declined: "Afgewezen",
  deferred: "Later",
  converted_to_qa: "Omgezet naar vraag",
};

export const ISSUE_PRIORITY_LABELS: Record<IssuePriority, string> = {
  urgent: "Urgent",
  high: "Hoog",
  medium: "Gemiddeld",
  low: "Laag",
};

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

// Klant ziet "Ontvangen" zowel vóór als na PM-endorsement (vision §5):
// PM-internal taal lekt niet naar het portal. `parked` (= deferred) is een
// aparte groep zodat de klant ziet dat 't aandacht heeft maar nog niet
// ingepland is. `declined` en `converted_to_qa` vallen onder "Afgerond"
// (dood-end voor de klant; `converted_to_qa` heeft een eigen FK naar de
// spawned vraag voor traceability).
export const PORTAL_STATUS_GROUPS = [
  {
    key: "ontvangen",
    label: "Ontvangen",
    internalStatuses: ["needs_pm_review", "triage"],
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
    key: "parked",
    label: "Later",
    internalStatuses: ["deferred"],
  },
  {
    key: "afgerond",
    label: "Afgerond",
    internalStatuses: ["done", "cancelled", "declined", "converted_to_qa"],
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
//   - client_pm → wat de klant-PM zelf indient via het portal-formulier
//   - end_user  → wat eindgebruikers indienen via embedded widgets
//                 (Userback óf JAIP-widget op de client-app)
//   - jaip      → wat JAIP intern aanmaakt (handmatig of door AI)
//
// De PM ziet onder "Mijn feedback" alleen `client_pm`; eindgebruiker-feedback
// landt via topic-curatie in de Roadmap, niet als ruwe ticket-stroom.
//
// `jaip_widget` (WG-004) hoort bij `end_user`: dezelfde mentale categorie
// als userback (embedded feedback-knop op de client-app, niet door de PM
// zelf ingediend). Zonder deze mapping zou widget-feedback default op
// 'jaip' vallen — verkeerde bucket voor eindgebruiker-feedback.
//
// Sleutels (`client_pm`, `end_user`) zijn aligned met DEVHUB_SOURCE_GROUPS
// hieronder zodat beide quadranten dezelfde stakeholder-taxonomie volgen.
// Verschil: PORTAL heeft een extra `jaip`-groep zodat de klant interne
// meldingen herkent; DEVHUB toont intern als default (geen badge).

export const PORTAL_SOURCE_GROUPS = [
  { key: "client_pm", label: "Mijn meldingen", sources: ["portal"] },
  { key: "end_user", label: "Van gebruikers", sources: ["userback", "jaip_widget"] },
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

// ── DevHub-specifieke source-groepering ──
//
// Sleutels (`client_pm`, `end_user`) zijn aligned met PORTAL_SOURCE_GROUPS
// — beide volgen dezelfde stakeholder-taxonomie. Verschil: DEVHUB heeft géén
// `jaip`-groep omdat intern (`manual`/`ai`) geen badge krijgt (default,
// zou visueel ruis geven). Resolver returnt `null` voor die sources.

export const DEVHUB_SOURCE_GROUPS = [
  { key: "client_pm", label: "Klant-PM", sources: ["portal"] },
  { key: "end_user", label: "Eindgebruiker", sources: ["userback", "jaip_widget"] },
] as const;

export type DevhubSourceGroupKey = (typeof DEVHUB_SOURCE_GROUPS)[number]["key"];

/** Mapt issue.source naar de DevHub-badge-groep, of null voor intern. */
export function resolveDevhubSourceGroup(
  source: string | null | undefined,
): DevhubSourceGroupKey | null {
  if (!source) return null;
  for (const group of DEVHUB_SOURCE_GROUPS) {
    if ((group.sources as readonly string[]).includes(source)) return group.key;
  }
  return null;
}

// ── PM-review-gate default-status (CC-001 vision §5) ──
//
// Klant-bronnen passeren de PM-gate (issue landt op `needs_pm_review`).
// Interne bronnen (manual/AI) gaan direct naar `triage` — een PM heeft die
// zelf aangemaakt of een AI-pipeline heeft 'm geclassificeerd, dus extra
// menselijke review is geen toevoeging. Centraal hier zodat een nieuwe
// klant-bron in één plek geregistreerd wordt en niet in 3 call-sites.

const CLIENT_SOURCED = new Set<string>(["portal", "userback", "jaip_widget"]);

export function defaultStatusForSource(source: string): IssueStatus {
  return CLIENT_SOURCED.has(source) ? "needs_pm_review" : "triage";
}

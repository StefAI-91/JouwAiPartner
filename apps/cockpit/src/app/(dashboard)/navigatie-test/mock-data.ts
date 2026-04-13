/**
 * Mock data voor de navigatie-test.
 * Deze data simuleert wat de focus-ranker zou ophalen uit productie.
 * Niet gekoppeld aan de echte database — puur voor visualisatie.
 */

export type HealthStatus = "rood" | "oranje" | "groen";

export interface FocusProject {
  id: string;
  name: string;
  organization: string;
  health: HealthStatus;
  openActions: number;
  reason: string;
  lastSignal: string;
  score: number;
  /** Welke signalen aan de score bijdroegen (voor de hover-breakdown) */
  signals: {
    health: number;
    actions: number;
    recency: number;
    ownerBonus: number;
    clientWaiting: number;
  };
}

export type ScenarioKey = "maandag-ochtend" | "woensdag-middag" | "vrijdag-eind";

export interface Scenario {
  key: ScenarioKey;
  label: string;
  timeLabel: string;
  greeting: string;
  subheading: string;
}

export const scenarios: Scenario[] = [
  {
    key: "maandag-ochtend",
    label: "Maandag 08:42",
    timeLabel: "Maandag · 08:42",
    greeting: "Goedemorgen, Stef",
    subheading: "3 projecten vragen aandacht voordat je de week in gaat",
  },
  {
    key: "woensdag-middag",
    label: "Woensdag 14:15",
    timeLabel: "Woensdag · 14:15",
    greeting: "Focus, Stef",
    subheading: "Midweek — één project op rood, twee wachten op jou",
  },
  {
    key: "vrijdag-eind",
    label: "Vrijdag 16:30",
    timeLabel: "Vrijdag · 16:30",
    greeting: "Bijna weekend",
    subheading: "Twee items die het weekend niet over moeten",
  },
];

export const focusByScenario: Record<ScenarioKey, FocusProject[]> = {
  "maandag-ochtend": [
    {
      id: "p1",
      name: "CAI Studio",
      organization: "Creative AI Partners",
      health: "rood",
      openActions: 4,
      reason: "Demo vrijdag — 2 openstaande beslissingen sinds overleg donderdag",
      lastSignal: "Overleg 3 dagen geleden",
      score: 94,
      signals: { health: 30, actions: 24, recency: 18, ownerBonus: 12, clientWaiting: 10 },
    },
    {
      id: "p2",
      name: "Flowwijs MVP",
      organization: "Flowwijs",
      health: "oranje",
      openActions: 6,
      reason: "E-mail klant zaterdag — wacht op antwoord over scope-uitbreiding",
      lastSignal: "E-mail 2 dagen geleden",
      score: 78,
      signals: { health: 18, actions: 30, recency: 14, ownerBonus: 6, clientWaiting: 10 },
    },
    {
      id: "p3",
      name: "Rinkel VoIP pipeline",
      organization: "Intern",
      health: "oranje",
      openActions: 3,
      reason: "Ege blokt op transcriptie-endpoint — jij bent gemarkeerd als reviewer",
      lastSignal: "Actie open sinds dinsdag",
      score: 64,
      signals: { health: 18, actions: 18, recency: 8, ownerBonus: 12, clientWaiting: 0 },
    },
    {
      id: "p4",
      name: "Klantportaal MVP",
      organization: "Intern",
      health: "groen",
      openActions: 2,
      reason: "Deadline Phase B over 3 weken — nog op schema",
      lastSignal: "Sprint 032 afgerond",
      score: 41,
      signals: { health: 6, actions: 12, recency: 10, ownerBonus: 12, clientWaiting: 0 },
    },
    {
      id: "p5",
      name: "Weekly Summarizer v2",
      organization: "Intern",
      health: "groen",
      openActions: 1,
      reason: "Prompt-tuning wacht op 2 weken approval-data",
      lastSignal: "Geen activiteit deze week",
      score: 28,
      signals: { health: 6, actions: 6, recency: 4, ownerBonus: 12, clientWaiting: 0 },
    },
  ],
  "woensdag-middag": [
    {
      id: "p2",
      name: "Flowwijs MVP",
      organization: "Flowwijs",
      health: "rood",
      openActions: 9,
      reason: "Klant bevestigde scope-uitbreiding — 3 nieuwe acties, deadline niet aangepast",
      lastSignal: "E-mail 12 minuten geleden",
      score: 96,
      signals: { health: 30, actions: 36, recency: 20, ownerBonus: 6, clientWaiting: 4 },
    },
    {
      id: "p1",
      name: "CAI Studio",
      organization: "Creative AI Partners",
      health: "oranje",
      openActions: 2,
      reason: "Demo vrijdag — overleg vandaag ging goed, nog 2 acties voor Wouter",
      lastSignal: "Overleg 2 uur geleden",
      score: 72,
      signals: { health: 18, actions: 12, recency: 24, ownerBonus: 12, clientWaiting: 6 },
    },
    {
      id: "p6",
      name: "Gmail Pipeline v2",
      organization: "Intern",
      health: "oranje",
      openActions: 5,
      reason: "Classifier-accuracy gedaald naar 82% — patroon in afwijzingen deze week",
      lastSignal: "Curator-alert 40 minuten geleden",
      score: 68,
      signals: { health: 18, actions: 20, recency: 18, ownerBonus: 12, clientWaiting: 0 },
    },
    {
      id: "p3",
      name: "Rinkel VoIP pipeline",
      organization: "Intern",
      health: "groen",
      openActions: 1,
      reason: "Ege heeft transcriptie-endpoint gemerged, reviewer check open",
      lastSignal: "PR 1 uur geleden",
      score: 38,
      signals: { health: 6, actions: 6, recency: 14, ownerBonus: 12, clientWaiting: 0 },
    },
  ],
  "vrijdag-eind": [
    {
      id: "p1",
      name: "CAI Studio",
      organization: "Creative AI Partners",
      health: "rood",
      openActions: 3,
      reason: "Demo was vanochtend — klant wacht op follow-up met 3 beslispunten",
      lastSignal: "Meeting 6 uur geleden",
      score: 88,
      signals: { health: 30, actions: 18, recency: 22, ownerBonus: 12, clientWaiting: 6 },
    },
    {
      id: "p2",
      name: "Flowwijs MVP",
      organization: "Flowwijs",
      health: "oranje",
      openActions: 4,
      reason: "Klant vroeg vanmiddag om status-update voor maandag",
      lastSignal: "E-mail 2 uur geleden",
      score: 74,
      signals: { health: 18, actions: 16, recency: 22, ownerBonus: 6, clientWaiting: 12 },
    },
    {
      id: "p7",
      name: "Portal RLS upgrade",
      organization: "Intern",
      health: "groen",
      openActions: 2,
      reason: "Blokkeert Phase B — geen urgentie dit weekend",
      lastSignal: "Actie 1 dag geleden",
      score: 32,
      signals: { health: 6, actions: 8, recency: 6, ownerBonus: 12, clientWaiting: 0 },
    },
  ],
};

export const scoringWeights = [
  { key: "health", label: "Gezondheid (rood/oranje)", max: 30 },
  { key: "actions", label: "Openstaande acties op jou", max: 40 },
  { key: "recency", label: "Recente activiteit", max: 25 },
  { key: "ownerBonus", label: "Jij bent owner/reviewer", max: 15 },
  { key: "clientWaiting", label: "Klant wacht op ons", max: 15 },
] as const;

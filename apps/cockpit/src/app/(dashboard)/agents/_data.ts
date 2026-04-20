export type Quadrant = "cockpit" | "devhub" | "portal" | "delivery" | "cross";
export type AgentStatus = "live" | "building" | "planned";

export interface Agent {
  id: string;
  name: string;
  role: string;
  model: string;
  quadrant: Quadrant;
  status: AgentStatus;
  mascot: string;
  description: string;
  lastRunMinutesAgo?: number;
  runsToday?: number;
  costToday?: number;
  successRate?: number;
  sprintProgress?: { done: number; total: number; eta: string };
  plannedQuarter?: string;
}

export interface ActivityEvent {
  id: string;
  agentName: string;
  mascot: string;
  quadrant: Quadrant;
  summary: string;
  detail?: string;
  minutesAgo: number;
  model: string;
  cost: number;
  durationSec: number;
  outcome: "success" | "blocked" | "error";
}

export interface SystemStats {
  activeCount: number;
  totalCount: number;
  activeNames: string[];
  runsToday: number;
  runsYesterday: number;
  costToday: number;
  costBudget: number;
  uptimePercent: number;
}

export const agents: Agent[] = [
  {
    id: "gatekeeper",
    name: "Gatekeeper",
    role: "De poortwachter",
    model: "Haiku 4.5",
    quadrant: "cockpit",
    status: "live",
    mascot: "🛡️",
    description:
      "Classificeert inkomende meetings op type, party en relevantie voordat ze de pijplijn ingaan.",
    lastRunMinutesAgo: 12,
    runsToday: 47,
    costToday: 0.12,
    successRate: 100,
  },
  {
    id: "extractor",
    name: "Extractor",
    role: "De detective",
    model: "Sonnet",
    quadrant: "cockpit",
    status: "live",
    mascot: "🕵️",
    description:
      "Haalt decisions, action items, needs en insights uit transcripts — met confidence + bronverwijzing.",
    lastRunMinutesAgo: 8,
    runsToday: 23,
    costToday: 1.84,
    successRate: 96,
  },
  {
    id: "classifier",
    name: "Classifier",
    role: "De sorteerder",
    model: "Haiku 4.5",
    quadrant: "devhub",
    status: "live",
    mascot: "🗂️",
    description:
      "Labelt binnenkomende issues op type, component en severity. Stelt repro-stappen voor.",
    lastRunMinutesAgo: 3,
    runsToday: 31,
    costToday: 0.09,
    successRate: 100,
  },
  {
    id: "risk-analyzer",
    name: "Risk Analyzer",
    role: "De wachter",
    model: "Sonnet",
    quadrant: "cockpit",
    status: "building",
    mascot: "🦉",
    description:
      "Spot risico's in projecten: deadlines, afhankelijkheden, tegenstrijdige decisions. Waarschuwt voordat het misgaat.",
    sprintProgress: { done: 4, total: 7, eta: "Verwacht live: deze week" },
  },
  {
    id: "planner",
    name: "Planner",
    role: "De architect",
    model: "Sonnet",
    quadrant: "devhub",
    status: "planned",
    mascot: "📐",
    description: "Zet decisions en needs om in uitvoerbare plannen + tickets.",
    plannedQuarter: "Q3 2026",
  },
  {
    id: "executor",
    name: "Executor",
    role: "De bouwer",
    model: "Opus",
    quadrant: "devhub",
    status: "planned",
    mascot: "🤖",
    description: "Pakt tickets op, schrijft code, opent PR's voor review.",
    plannedQuarter: "Q3 2026",
  },
  {
    id: "curator",
    name: "Curator",
    role: "De tuinman",
    model: "Sonnet",
    quadrant: "cockpit",
    status: "planned",
    mascot: "🧹",
    description: "Nachtelijke opruiming: duplicaten, staleness, tegenstrijdigheden.",
    plannedQuarter: "Q2 2026",
  },
  {
    id: "analyst",
    name: "Analyst",
    role: "De strateeg",
    model: "Opus",
    quadrant: "cockpit",
    status: "planned",
    mascot: "🔬",
    description: "Dagelijkse pattern-analyse over alle bronnen heen. Trends + risico's.",
    plannedQuarter: "Q3 2026",
  },
  {
    id: "communicator",
    name: "Communicator",
    role: "De stem",
    model: "Sonnet",
    quadrant: "portal",
    status: "planned",
    mascot: "💬",
    description: "Schrijft klant-updates en antwoorden in jouw tone of voice.",
    plannedQuarter: "Q4 2026",
  },
  {
    id: "support",
    name: "Support",
    role: "De helper",
    model: "Haiku",
    quadrant: "delivery",
    status: "planned",
    mascot: "🎧",
    description: "Chatbot in klant-apps: beantwoordt vragen, escaleert tickets.",
    plannedQuarter: "Q4 2026",
  },
  {
    id: "dispatcher",
    name: "Dispatcher",
    role: "De traffic control",
    model: "Haiku",
    quadrant: "cross",
    status: "planned",
    mascot: "📡",
    description: "Routeert alerts en insights naar Slack, email of andere kanalen.",
    plannedQuarter: "Q2 2026",
  },
];

export const activityFeed: ActivityEvent[] = [
  {
    id: "evt-1",
    agentName: "Classifier",
    mascot: "🗂️",
    quadrant: "devhub",
    summary: "classificeerde issue #DH-142 — bug · auth · high",
    minutesAgo: 3,
    model: "Haiku",
    cost: 0.003,
    durationSec: 1.2,
    outcome: "success",
  },
  {
    id: "evt-2",
    agentName: "Extractor",
    mascot: "🕵️",
    quadrant: "cockpit",
    summary: 'haalde 7 extractions uit "Roadmap Q3 — Acme"',
    detail: "3 decisions · 2 action items · 2 insights",
    minutesAgo: 8,
    model: "Sonnet",
    cost: 0.08,
    durationSec: 4.7,
    outcome: "success",
  },
  {
    id: "evt-3",
    agentName: "Gatekeeper",
    mascot: "🛡️",
    quadrant: "cockpit",
    summary: 'liet meeting "Standup" door — type: internal · relevance 0,82',
    minutesAgo: 12,
    model: "Haiku",
    cost: 0.002,
    durationSec: 0.9,
    outcome: "success",
  },
  {
    id: "evt-4",
    agentName: "Gatekeeper",
    mascot: "🛡️",
    quadrant: "cockpit",
    summary: "hield meeting tegen — relevance 0,23 · reason: persoonlijk gesprek",
    minutesAgo: 18,
    model: "Haiku",
    cost: 0.001,
    durationSec: 0.8,
    outcome: "blocked",
  },
  {
    id: "evt-5",
    agentName: "Classifier",
    mascot: "🗂️",
    quadrant: "devhub",
    summary: "classificeerde issue #DH-141 — feature · ui · medium",
    minutesAgo: 22,
    model: "Haiku",
    cost: 0.003,
    durationSec: 1.1,
    outcome: "success",
  },
];

export const systemStats: SystemStats = {
  activeCount: 3,
  totalCount: 11,
  activeNames: ["Gatekeeper", "Extractor", "Classifier"],
  runsToday: 101,
  runsYesterday: 86,
  costToday: 2.05,
  costBudget: 10,
  uptimePercent: 100,
};

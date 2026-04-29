import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Centraal register van alle actieve AI-agents. Eén bron van waarheid voor
 * de /agents observability pagina: welke agents draaien, in welk quadrant,
 * welk model, welke rol, waar staat het systeem-prompt.
 *
 * Gepland / mock-agents horen NIET in dit register — alleen agents die
 * daadwerkelijk in de pipeline worden aangeroepen. Orphan-agents zonder
 * call-site (bijv. email-extractor, issue-executor) ook niet.
 */

export type AgentStatus = "live" | "building";
export type AgentQuadrant = "cockpit" | "devhub" | "portal" | "delivery" | "cross";

export interface AgentDefinition {
  /** Stable ID — MUST match agent_name column in agent_runs. */
  id: string;
  /** Display name for UI. */
  name: string;
  /** Short mascot-role ("De poortwachter", "De detective"). */
  role: string;
  /** User-facing description of what the agent does. */
  description: string;
  /** Emoji mascot for the card. */
  mascot: string;
  /** Model ID as passed to `anthropic(...)`. */
  model: string;
  /** Human-readable model name ("Haiku 4.5", "Sonnet 4.6"). */
  modelLabel: string;
  /** Which quadrant does this agent serve. */
  quadrant: AgentQuadrant;
  /** live = in production; building = wired up maar nog niet geactiveerd. */
  status: AgentStatus;
  /** Path to system prompt .md file relative to packages/ai/prompts/. */
  promptFile: string;
  /** Main call-site path, voor "waar wordt deze agent gebruikt" link. */
  entrypoint: string;
}

const AGENTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts");

export const AGENT_REGISTRY: AgentDefinition[] = [
  {
    id: "gatekeeper",
    name: "Gatekeeper",
    role: "De poortwachter",
    description:
      "Classificeert inkomende meetings op type, party en relevantie voordat ze de pijplijn ingaan.",
    mascot: "🛡️",
    model: "claude-haiku-4-5-20251001",
    modelLabel: "Haiku 4.5",
    quadrant: "cockpit",
    status: "live",
    promptFile: "gatekeeper.md",
    entrypoint: "packages/ai/src/pipeline/gatekeeper-pipeline.ts",
  },
  {
    id: "summarizer",
    name: "Summarizer",
    role: "De verhalenverteller",
    description:
      "Maakt rijke, uitputtende samenvattingen per meeting — briefing, kernpunten, deelnemers, vervolgstappen.",
    mascot: "📝",
    model: "claude-sonnet-4-5-20250929",
    modelLabel: "Sonnet 4.5",
    quadrant: "cockpit",
    status: "live",
    promptFile: "summarizer.md",
    entrypoint: "packages/ai/src/pipeline/steps/summarize.ts",
  },
  {
    id: "title-generator",
    name: "Title Generator",
    role: "De kopmaker",
    description: "Genereert korte, informatieve onderwerp-titels voor meetings.",
    mascot: "✍️",
    model: "claude-haiku-4-5-20251001",
    modelLabel: "Haiku 4.5",
    quadrant: "cockpit",
    status: "live",
    promptFile: "title-generator.md",
    entrypoint: "packages/ai/src/pipeline/steps/generate-title.ts",
  },
  {
    id: "needs-scanner",
    name: "Needs Scanner",
    role: "De behoefte-speurder",
    description:
      "Scant meeting-samenvattingen op behoeftes van het team: tooling, kennis, capaciteit, proces.",
    mascot: "🔎",
    model: "claude-haiku-4-5-20251001",
    modelLabel: "Haiku 4.5",
    quadrant: "cockpit",
    status: "live",
    promptFile: "needs-scanner.md",
    entrypoint: "packages/ai/src/pipeline/scan-needs.ts",
  },
  {
    id: "management-insights",
    name: "Management Insights",
    role: "De bestuurs-analist",
    description:
      "Signaleert cross-meeting patronen over bestuurlijke overleggen: opvolging, klant-pipeline, terugkerende thema's.",
    mascot: "👔",
    model: "claude-sonnet-4-5-20250929",
    modelLabel: "Sonnet 4.5",
    quadrant: "cockpit",
    status: "live",
    promptFile: "management-insights.md",
    entrypoint: "packages/ai/src/pipeline/management-insights-pipeline.ts",
  },
  {
    id: "weekly-summarizer",
    name: "Weekly Summarizer",
    role: "De week-verslaggever",
    description:
      "Genereert een wekelijks management-overzicht: project health, cross-project risks, focus-acties.",
    mascot: "📅",
    model: "claude-sonnet-4-5-20250929",
    modelLabel: "Sonnet 4.5",
    quadrant: "cockpit",
    status: "live",
    promptFile: "weekly-summarizer.md",
    entrypoint: "packages/ai/src/pipeline/weekly-summary-pipeline.ts",
  },
  {
    id: "project-summarizer",
    name: "Project Summarizer",
    role: "De project-analist",
    description:
      "Genereert context, briefing en timeline per project op basis van alle meetings en emails.",
    mascot: "📊",
    model: "claude-haiku-4-5-20251001",
    modelLabel: "Haiku 4.5",
    quadrant: "cockpit",
    status: "live",
    promptFile: "project-summarizer.md",
    entrypoint: "packages/ai/src/pipeline/summary-pipeline.ts",
  },
  {
    id: "org-summarizer",
    name: "Org Summarizer",
    role: "De klant-analist",
    description:
      "Genereert context, briefing en timeline per organisatie. Focust op relatie (bij 0 projecten) of cross-project (bij 1+).",
    mascot: "🏢",
    model: "claude-haiku-4-5-20251001",
    modelLabel: "Haiku 4.5",
    quadrant: "cockpit",
    status: "live",
    promptFile: "org-summarizer.md",
    entrypoint: "packages/ai/src/pipeline/summary-pipeline.ts",
  },
  {
    id: "email-classifier",
    name: "Email Classifier",
    role: "De sorteerder",
    description:
      "Classificeert inkomende emails op relevantie, type, party en koppelt ze aan projecten.",
    mascot: "📬",
    model: "claude-haiku-4-5-20251001",
    modelLabel: "Haiku 4.5",
    quadrant: "cockpit",
    status: "live",
    promptFile: "email-classifier.md",
    entrypoint: "packages/ai/src/pipeline/email-pipeline.ts",
  },
  {
    id: "issue-classifier",
    name: "Issue Classifier",
    role: "De triage-assistent",
    description:
      "Classificeert binnenkomende Userback-feedback: type, component, severity + reproductiestappen.",
    mascot: "🗂️",
    model: "claude-haiku-4-5-20251001",
    modelLabel: "Haiku 4.5",
    quadrant: "devhub",
    status: "live",
    promptFile: "issue-classifier.md",
    entrypoint: "apps/devhub/src/actions/classify.ts",
  },
  {
    id: "bulk-cluster-cleanup",
    name: "Bulk Cluster Cleanup",
    role: "De opruim-coach",
    description:
      "On-demand batch-agent die open ungrouped Userback-issues per project clustert. Stelt matches voor met bestaande topics of nieuwe topics; mens accepteert per cluster. Niet-persistent — voor het ruimen van achterstand.",
    mascot: "🧹",
    model: "claude-haiku-4-5-20251001",
    modelLabel: "Haiku 4.5",
    quadrant: "devhub",
    status: "live",
    promptFile: "bulk-cluster-cleanup.md",
    entrypoint: "apps/devhub/src/actions/bulk-cluster-cleanup.ts",
  },
  {
    id: "issue-reviewer",
    name: "Issue Reviewer",
    role: "De health-analist",
    description:
      "Analyseert alle issues per project: health-score, patronen, risico's en concrete aanbevelingen.",
    mascot: "🩺",
    model: "claude-sonnet-4-5-20250929",
    modelLabel: "Sonnet 4.5",
    quadrant: "devhub",
    status: "live",
    promptFile: "issue-reviewer.md",
    entrypoint: "apps/devhub/src/actions/review.ts",
  },
  {
    id: "risk-specialist",
    name: "Risk Specialist",
    role: "De wachter",
    description:
      "Gespecialiseerde risk-extractor op Sonnet 4.6 met 'high' effort voor cross-turn patroon-detectie. Draait parallel aan de hoofdpipeline en schrijft zijn risks direct naar de extractions-tabel.",
    mascot: "🦉",
    model: "claude-sonnet-4-6",
    modelLabel: "Sonnet 4.6",
    quadrant: "cockpit",
    status: "live",
    promptFile: "risk_specialist.md",
    entrypoint: "packages/ai/src/pipeline/steps/risk-specialist.ts",
  },
  {
    id: "action-item-specialist",
    name: "Action Item Specialist",
    role: "De toezeggings-detective",
    description:
      "Single-type specialist die action_items uit een Fireflies-transcript extraheert op Sonnet 4.6 high-effort. Past het 4-eis-model toe (rol/toezegging/concreet/agency) met een action-validator als adversariële tweede stage. Draait parallel aan de hoofdpipeline en schrijft naar extractions + run-telemetrie naar experimental_action_item_extractions.",
    mascot: "🎯",
    model: "claude-sonnet-4-6",
    modelLabel: "Sonnet 4.6",
    quadrant: "cockpit",
    status: "live",
    promptFile: "action_item_specialist.md",
    entrypoint: "packages/ai/src/pipeline/steps/action-item-specialist.ts",
  },
  {
    id: "theme-detector",
    name: "Theme Detector",
    role: "De thema-kartograaf",
    description:
      "Draait serieel na de Gatekeeper en vóór Summarizer + RiskSpecialist. Identificeert welke cross-meeting thema's substantieel spelen (substantialiteitsregel: ≥2 kernpunten of ≥100 woorden) en stelt zeer selectief nieuwe thema's voor als dat écht ontbreekt. Extract-time scoping: extractions worden per-theme gelinkt via [Themes:] annotaties van Summarizer + RiskSpecialist — niet post-hoc over de hele meeting.",
    mascot: "🧭",
    model: "claude-sonnet-4-6",
    modelLabel: "Sonnet 4.6",
    quadrant: "cockpit",
    status: "live",
    promptFile: "theme-detector.md",
    entrypoint: "packages/ai/src/pipeline/steps/theme-detector.ts",
  },
  {
    id: "theme-narrator",
    name: "Theme Narrator",
    role: "De thema-verteller",
    description:
      "Draait per thema nadat meeting_themes wordt bijgewerkt: synthetiseert alle per-meeting theme-summaries tot één lopende thema-pagina met zes secties (De kern, Wat we terug zien komen, Waar jullie samen staan, Waar het schuurt, Wat nog hangt, De blinde vlek) + een signaal-check. Effort 'high' voor cross-meeting patroon-detectie in de blind-spots-sectie. Guardrail: <2 meetings met summary → agent wordt niet gecalled, sentinel-rij geschreven voor de UI empty-state.",
    mascot: "🗣️",
    model: "claude-sonnet-4-6",
    modelLabel: "Sonnet 4.6",
    quadrant: "cockpit",
    status: "live",
    promptFile: "theme-narrator.md",
    entrypoint: "packages/ai/src/pipeline/steps/synthesize-theme-narrative.ts",
  },
];

/**
 * Read the system prompt for an agent from its .md file. Synchronous because
 * prompts are bundled with the package and never change at runtime.
 */
export function readAgentPrompt(agent: AgentDefinition): string {
  return readFileSync(resolve(AGENTS_DIR, agent.promptFile), "utf8").trimEnd();
}

export function getAgentById(id: string): AgentDefinition | undefined {
  return AGENT_REGISTRY.find((a) => a.id === id);
}

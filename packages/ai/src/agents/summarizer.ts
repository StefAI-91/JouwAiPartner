import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  SummarizerOutputSchema,
  SummarizerOutput,
  type ThemeSummary,
} from "../validations/summarizer";
import { withAgentRun } from "./run-logger";

const MODEL = "claude-sonnet-4-5-20250929";

/**
 * TH-013 (AI-244) — Prompt-version telemetry. Bump naar `"v2"` bij elke
 * prompt-wijziging die het output-contract raakt; `agent_runs.prompt_version`
 * maakt historische runs terugvindbaar per contract-versie.
 */
export const SUMMARIZER_PROMPT_VERSION = "v2";

/**
 * TH-013 (AI-243) — Post-validation caps om output-token-explosion te
 * voorkomen op meetings met veel thema's + veel content. Overshoot wordt
 * getruncated met console.warn (niet blocking).
 */
export const THEME_SUMMARIES_HARD_CAP = 6;
export const KERNPUNTEN_PER_THEME_CAP = 10;
export const VERVOLGSTAPPEN_PER_THEME_CAP = 6;

export type { SummarizerOutput, ThemeSummary };

const MEETING_TYPE_INSTRUCTIONS: Record<string, string> = {
  // Intern
  strategy: `Focus extra op:
- Strategische besluiten en richtingkeuzes
- Risico's en langetermijn-implicaties
- Prioriteiten en trade-offs`,

  one_on_one: `Focus extra op:
- Persoonlijke doelen en voortgang
- Blokkades en frustraties
- Feedback (gegeven en ontvangen)
- Concrete afspraken en acties`,

  team_sync: `Focus extra op:
- Blokkades en afhankelijkheden
- Prioriteiten voor de komende periode
- Wie werkt waaraan`,

  // Extern
  discovery: `Focus extra op:
- Klantbehoeften, pijnpunten, wensen — wees uitputtend, mis niets
- Budget- en tijdlijn-signalen (als genoemd)
- Wie beslist er, wie moet overtuigd worden
- Technische context en huidige systemen
- Methode of werkwijze van de klant: als de klant uitlegt HOE ze werken, welke methodiek ze hanteren, of welk model ze gebruiken, beschrijf dit uitgebreid — het bepaalt productontwerp
- Go-to-market signalen: hoe komt de klant aan gebruikers, welke groeidynamiek beschrijven ze, ambassadeurseffecten
- Concrete voorbeelden en casussen die de klant noemt — deze illustreren behoeften beter dan abstracte beschrijvingen
- Financiële doelen of succesindicatoren die de klant noemt`,

  sales: `Focus extra op:
- Scope en pricing afspraken
- Klantbehoeften en gevraagde features
- Beslissers en stakeholders
- Concurrentie-signalen
- Financiële verwachtingen en budgetindicaties`,

  project_kickoff: `Focus extra op:
- Scope-afspraken en rolverdeling
- Planning en milestones
- Acceptatiecriteria en randvoorwaarden
- Achtergrond en context die de klant deelt over zichzelf, hun bedrijf en hun doelgroep`,

  status_update: `Focus extra op:
- Voortgang: wat is af, wat loopt, wat is vertraagd
- Blokkades en risico's
- Scope-wijzigingen (bijgekomen of geschrapt)
- Klanttevredenheid-signalen`,

  collaboration: `Focus extra op:
- Samenwerkingsafspraken en rolverdeling
- Wat beide partijen nodig hebben
- Concrete vervolgstappen`,
};

const SYSTEM_PROMPT = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts/summarizer.md"),
  "utf8",
).trimEnd();

/**
 * Run the Summarizer agent on a meeting transcript.
 * Uses Sonnet for reasoning capability — generates a rich, structured summary.
 */
export interface SummarizerIdentifiedTheme {
  /** UUID — Summarizer gebruikt 'm als `themeId` in `theme_summaries[]` output (TH-013 AI-240). */
  themeId: string;
  name: string;
  description: string;
}

export async function runSummarizer(
  transcript: string,
  context: {
    title: string;
    meeting_type: string;
    party_type: string;
    participants: string[];
    /** Formatted speaker names with labels (INTERN/EXTERN/ONBEKEND) from Fireflies */
    speakerContext?: string | null;
    entityContext?: string;
    /**
     * TH-011 (AI-235) + TH-013 (AI-240) — Themes die de Theme-Detector als
     * substantieel heeft aangemerkt. Voedt twee functies:
     *   1. `[Themes: X, Y]` markers op kernpunten/vervolgstappen (TH-011)
     *   2. Per-thema rijke samenvattingen in `theme_summaries[]` (TH-013)
     *
     * Elk thema heeft nu `themeId` zodat de Summarizer de juiste UUID
     * terug kan geven in de output (niet de naam — naam-resolve faalt bij
     * rename). Lege of ontbrekende lijst = geen markers + leeg
     * theme_summaries array.
     */
    identified_themes?: SummarizerIdentifiedTheme[];
    /**
     * TH-013 — Optioneel voor telemetry (landt in `agent_runs.metadata.meeting_id`).
     */
    meetingId?: string;
  },
): Promise<SummarizerOutput> {
  const typeInstructions = MEETING_TYPE_INSTRUCTIONS[context.meeting_type] ?? "";

  // Use speaker context (rich names with labels) when available, fall back to raw participants
  const deelnemersSection = context.speakerContext
    ? `Deelnemers (uit transcript):\n${context.speakerContext}`
    : `Deelnemers: ${context.participants.join(", ")}`;

  const themesSection =
    context.identified_themes && context.identified_themes.length > 0
      ? `\n--- GEÏDENTIFICEERDE THEMA'S (cross-cutting lenzen) ---\n${context.identified_themes
          .map((t) => `- themeId: ${t.themeId}\n  name: ${t.name}\n  description: ${t.description}`)
          .join(
            "\n",
          )}\n\nAls een kernpunt of vervolgstap los van het specifieke project óók relevant is voor een van deze thema's, annoteer 'm dan met \`[Themes: Name1, Name2]\` (exacte namen uit deze lijst, comma-separated). Plaats achter of na de \`[ProjectName]\` prefix. Alleen bij substantiële cross-cutting relevantie — project-specifieke content krijgt géén marker.\n\nVoor \`theme_summaries[]\` (sectie 5 in de prompt): gebruik de \`themeId\` UUID exact zoals hierboven vermeld.`
      : null;

  const contextPrefix = [
    `Titel: ${context.title}`,
    `Type: ${context.meeting_type}`,
    `Party: ${context.party_type}`,
    deelnemersSection,
    typeInstructions ? `\n--- TYPE-SPECIFIEKE FOCUS ---\n${typeInstructions}` : null,
    context.entityContext
      ? `\n--- BEKENDE ENTITEITEN (uit database) ---\n${context.entityContext}\nGebruik deze namen en projectnamen als je ze herkent in het transcript. Gebruik de EXACTE schrijfwijze uit deze lijst, niet varianten uit het transcript.`
      : null,
    themesSection,
  ]
    .filter(Boolean)
    .join("\n");

  const validThemeIds = new Set(context.identified_themes?.map((t) => t.themeId) ?? []);
  const themesRequested = validThemeIds.size;

  return withAgentRun(
    {
      agent_name: "summarizer",
      model: MODEL,
      prompt_version: SUMMARIZER_PROMPT_VERSION,
      metadata: {
        ...(context.meetingId ? { meeting_id: context.meetingId } : {}),
        themes_requested: themesRequested,
      },
    },
    async () => {
      const { object, usage } = await generateObject({
        model: anthropic(MODEL),
        maxRetries: 3,
        schema: SummarizerOutputSchema,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
            providerOptions: {
              anthropic: { cacheControl: { type: "ephemeral" } },
            },
          },
          {
            role: "user",
            content: `${contextPrefix}\n\n--- TRANSCRIPT ---\n${transcript}`,
          },
        ],
      });

      // TH-013 (EDGE-240) — Hallucination-strip: verwijder theme_summaries
      // met een themeId die niet in de meegegeven identified_themes staat.
      // Zelfde patroon als Theme-Detector (TH-011 AI-233).
      const knownThemeSummaries = object.theme_summaries.filter((ts) => {
        if (validThemeIds.has(ts.themeId)) return true;
        console.warn(
          `[summarizer] onbekende themeId "${ts.themeId}" gestript — meeting=${context.meetingId ?? "?"}`,
        );
        return false;
      });

      // TH-013 (AI-243 / EDGE-242) — Caps applicatie: max aantal theme-
      // summaries + max bullets per theme. Overshoot → truncate + warn.
      const capped = knownThemeSummaries.slice(0, THEME_SUMMARIES_HARD_CAP);
      if (knownThemeSummaries.length > THEME_SUMMARIES_HARD_CAP) {
        console.warn(
          `[summarizer] theme_summaries gecapt van ${knownThemeSummaries.length} naar ${THEME_SUMMARIES_HARD_CAP} — meeting=${context.meetingId ?? "?"}`,
        );
      }
      const cappedEntries: ThemeSummary[] = capped.map((ts) => {
        const kp = ts.kernpunten.slice(0, KERNPUNTEN_PER_THEME_CAP);
        const vs = ts.vervolgstappen.slice(0, VERVOLGSTAPPEN_PER_THEME_CAP);
        if (ts.kernpunten.length > KERNPUNTEN_PER_THEME_CAP) {
          console.warn(
            `[summarizer] kernpunten getruncated van ${ts.kernpunten.length} naar ${KERNPUNTEN_PER_THEME_CAP} — meeting=${context.meetingId ?? "?"} themeId=${ts.themeId}`,
          );
        }
        if (ts.vervolgstappen.length > VERVOLGSTAPPEN_PER_THEME_CAP) {
          console.warn(
            `[summarizer] vervolgstappen getruncated van ${ts.vervolgstappen.length} naar ${VERVOLGSTAPPEN_PER_THEME_CAP} — meeting=${context.meetingId ?? "?"} themeId=${ts.themeId}`,
          );
        }
        return { ...ts, kernpunten: kp, vervolgstappen: vs };
      });

      // TH-013 (EDGE-241) — Telemetry-vlag voor monitoring: Summarizer
      // leverde minder theme_summaries dan identified_themes. Kan duiden op
      // prompt-degradatie — landt in `agent_runs.metadata`.
      const themeSummariesMissing = themesRequested > 0 && cappedEntries.length < themesRequested;
      if (themeSummariesMissing) {
        console.warn(
          `[summarizer] theme_summaries_missing: ${cappedEntries.length}/${themesRequested} — meeting=${context.meetingId ?? "?"}`,
        );
      }

      const result: SummarizerOutput = { ...object, theme_summaries: cappedEntries };

      return {
        result,
        usage,
        metadata: {
          theme_summaries_count: cappedEntries.length,
          ...(themeSummariesMissing ? { theme_summaries_missing: true } : {}),
        },
      };
    },
  );
}

/**
 * Format a SummarizerOutput as readable text for the summary column.
 * Structured with clear hierarchy so it works in UI, embeddings, and MCP tools.
 */
export function formatSummary(output: SummarizerOutput): string {
  const sections: string[] = [];

  // Kernpunten (theme headers start with ###, regular points get bullet prefix)
  const kernpuntenLines = output.kernpunten.map((k) =>
    k.startsWith("### ") ? `\n${k}` : `- ${k}`,
  );
  sections.push("## Kernpunten\n" + kernpuntenLines.join("\n"));

  // Deelnemers
  const deelnemerLines = output.deelnemers.map((d) => {
    const parts = [`**${d.name}**`];
    if (d.role) parts.push(d.role);
    if (d.organization) parts.push(d.organization);
    if (d.stance) parts.push(`(${d.stance})`);
    return `- ${parts.join(" — ")}`;
  });
  sections.push("## Deelnemers\n" + deelnemerLines.join("\n"));

  // Vervolgstappen
  if (output.vervolgstappen.length > 0) {
    sections.push(
      "## Vervolgstappen\n" + output.vervolgstappen.map((v) => `- [ ] ${v}`).join("\n"),
    );
  }

  return sections.join("\n\n");
}

/**
 * TH-013 (AI-242) — Render één ThemeSummary als markdown-string voor
 * `meeting_themes.summary`. Structuur matcht de meeting-wide rich summary
 * zodat de UI-renderer dezelfde visuele taal kan gebruiken. Lege secties
 * worden weggelaten — geen placeholder-tekst als kernpunten of
 * vervolgstappen leeg zijn.
 */
export function formatThemeSummary(ts: ThemeSummary): string {
  const sections: string[] = [];

  sections.push(`## Briefing\n${ts.briefing}`);

  if (ts.kernpunten.length > 0) {
    sections.push("## Kernpunten\n" + ts.kernpunten.map((k) => `- ${k}`).join("\n"));
  }

  if (ts.vervolgstappen.length > 0) {
    sections.push("## Vervolgstappen\n" + ts.vervolgstappen.map((v) => `- [ ] ${v}`).join("\n"));
  }

  return sections.join("\n\n");
}

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { SummarizerOutputSchema, SummarizerOutput } from "../validations/summarizer";
import { withAgentRun } from "./run-logger";

const MODEL = "claude-sonnet-4-5-20250929";

export type { SummarizerOutput };

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
  },
): Promise<SummarizerOutput> {
  const typeInstructions = MEETING_TYPE_INSTRUCTIONS[context.meeting_type] ?? "";

  // Use speaker context (rich names with labels) when available, fall back to raw participants
  const deelnemersSection = context.speakerContext
    ? `Deelnemers (uit transcript):\n${context.speakerContext}`
    : `Deelnemers: ${context.participants.join(", ")}`;

  const contextPrefix = [
    `Titel: ${context.title}`,
    `Type: ${context.meeting_type}`,
    `Party: ${context.party_type}`,
    deelnemersSection,
    typeInstructions ? `\n--- TYPE-SPECIFIEKE FOCUS ---\n${typeInstructions}` : null,
    context.entityContext
      ? `\n--- BEKENDE ENTITEITEN (uit database) ---\n${context.entityContext}\nGebruik deze namen en projectnamen als je ze herkent in het transcript. Gebruik de EXACTE schrijfwijze uit deze lijst, niet varianten uit het transcript.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return withAgentRun({ agent_name: "summarizer", model: MODEL }, async () => {
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

    return { result: object, usage };
  });
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

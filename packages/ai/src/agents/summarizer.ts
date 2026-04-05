import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { SummarizerOutputSchema, SummarizerOutput } from "../validations/summarizer";

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
- Klantbehoeften, pijnpunten, wensen
- Budget- en tijdlijn-signalen (als genoemd)
- Wie beslist er, wie moet overtuigd worden
- Technische context en huidige systemen`,

  sales: `Focus extra op:
- Scope en pricing afspraken
- Klantbehoeften en gevraagde features
- Beslissers en stakeholders
- Concurrentie-signalen`,

  project_kickoff: `Focus extra op:
- Scope-afspraken en rolverdeling
- Planning en milestones
- Acceptatiecriteria en randvoorwaarden`,

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

const SYSTEM_PROMPT = `Je bent de Summarizer: je maakt rijke, gestructureerde samenvattingen van meeting transcripten.
ALLE output moet in het Nederlands zijn (behalve exacte quotes als het transcript deels in het Engels is).

Je produceert:

1. BRIEFING — Een narratieve samenvatting in 3-5 zinnen, alsof je een collega in 30 seconden bijpraat over deze meeting. Noem wie er spraken, met welke organisatie, wat het belangrijkste resultaat was, en of er vervolgacties zijn. Schrijf in verleden tijd, informeel maar professioneel. Dit is het EERSTE dat iemand leest op het dashboard.

2. KERNPUNTEN — 5-10 punten die de meeting samenvatten, geordend op belang. Dit is het BELANGRIJKSTE onderdeel. Hier zit de intelligence: besluiten, behoeften, signalen, afspraken, risico's — alles wat ertoe doet.

   Geef elk punt een **bold label** als het een duidelijke categorie heeft:
   - **Besluit:** voor genomen besluiten (wie nam het, was het wederzijds?)
   - **Behoefte:** voor klantbehoeften, wensen, pijnpunten
   - **Afspraak:** voor concrete afspraken tussen partijen
   - **Signaal:** voor opvallende observaties, marktinformatie, trends
   - **Risico:** voor waarschuwingssignalen, blokkades, zorgen
   Punten zonder duidelijke categorie krijgen GEEN label.

   Voeg relevante exacte quotes uit het transcript inline toe tussen aanhalingstekens waar dat waarde toevoegt. Niet elk punt hoeft een quote — alleen waar het de bron ondersteunt.

3. DEELNEMERS — Profiel per deelnemer: naam, rol, organisatie, houding. Afleiden uit het gesprek als het niet expliciet gezegd wordt.

4. VERVOLGSTAPPEN — Concrete next steps die uit het gesprek komen. Formaat: "Actie — eigenaar, deadline" als eigenaar en/of deadline bekend zijn.

REGELS:
- De BRIEFING moet als een lopend verhaal lezen, NIET als bullet points.
- Kernpunten zijn geordend op belang, niet op volgorde in het gesprek.
- Wees concreet en specifiek, geen algemeenheden.
- Quotes moeten EXACT uit het transcript komen, niet geparafraseerd.
- Deelnemerprofielen: gebruik wat je kunt afleiden uit het gesprek.
- Vervolgstappen: alleen concrete acties, geen vage intenties.
- Als iets niet besproken is, neem het niet op. Verzin geen context.`;

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
  },
): Promise<SummarizerOutput> {
  const typeInstructions = MEETING_TYPE_INSTRUCTIONS[context.meeting_type] ?? "";

  const contextPrefix = [
    `Titel: ${context.title}`,
    `Type: ${context.meeting_type}`,
    `Party: ${context.party_type}`,
    `Deelnemers: ${context.participants.join(", ")}`,
    typeInstructions ? `\n--- TYPE-SPECIFIEKE FOCUS ---\n${typeInstructions}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5-20250929"),
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

  return object;
}

/**
 * Format a SummarizerOutput as readable text for the summary column.
 * Structured with clear hierarchy so it works in UI, embeddings, and MCP tools.
 */
export function formatSummary(output: SummarizerOutput): string {
  const sections: string[] = [];

  // Kernpunten
  sections.push("## Kernpunten\n" + output.kernpunten.map((k) => `- ${k}`).join("\n"));

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

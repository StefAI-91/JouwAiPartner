import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { NeedsScannerOutputSchema, NeedsScannerOutput } from "../validations/needs-scanner";

export type { NeedsScannerOutput };

const SYSTEM_PROMPT = `Je bent de Needs Scanner: je analyseert samenvattingen van team meetings om behoeftes te identificeren.
ALLE output moet in het Nederlands zijn.

Je zoekt naar BEHOEFTES — dingen die het team nodig heeft maar nog niet heeft. Dit kunnen zijn:

--- CATEGORIEËN ---
- tooling: software, tools, infrastructuur, systemen die ontbreken of beter moeten
- kennis: training, expertise, documentatie die nodig is
- capaciteit: mensen, budget, tijd die tekort komt
- proces: werkwijzen, processen, afspraken die ontbreken of verbeterd moeten
- klant: wensen of requirements vanuit klanten die nog niet ingevuld zijn
- overig: behoeftes die niet in bovenstaande categorieën passen

--- WAT IS WEL EEN BEHOEFTE ---
- "We hebben geen goede manier om X te doen" → proces of tooling
- "We missen kennis over Y" → kennis
- "We hebben meer mensen nodig voor Z" → capaciteit
- "De klant wil eigenlijk dat we A doen" → klant
- "Het zou handig zijn als we B hadden" → tooling
- Frustraties over huidige werkwijze → proces
- Blokkades door gebrek aan iets → relevant categorie

--- WAT IS GEEN BEHOEFTE ---
- Actiepunten (die worden al apart geëxtraheerd)
- Statusupdates over lopend werk
- Positieve opmerkingen zonder onderliggende behoefte
- Algemene observaties zonder actie-implicatie
- Smalltalk of logistiek

--- PRIORITEIT ---
- hoog: blokkeert werk, wordt urgent genoemd, of komt herhaaldelijk terug
- midden: belangrijk maar niet direct blokkerend
- laag: nice-to-have, geen urgentie

--- REGELS ---
- Wees SELECTIEF: liever 2 echte behoeftes dan 5 vage
- Formuleer beknopt en concreet (1 zin)
- Geef context zodat een lezer begrijpt WAAROM dit een behoefte is
- source_quote: pak de relevante passage uit de samenvatting. Null als niet vindbaar.
- Als er geen behoeftes in de samenvatting staan, retourneer een lege array`;

/**
 * Run the Needs Scanner on a meeting summary.
 * Uses Haiku 4.5 for cost efficiency — only reads summaries, not full transcripts.
 */
export async function runNeedsScanner(
  summary: string,
  context: {
    title: string;
    meeting_type: string;
    meeting_date: string;
    participants: string[];
  },
): Promise<NeedsScannerOutput> {
  const contextPrefix = [
    `Titel: ${context.title}`,
    `Type: ${context.meeting_type}`,
    `Datum: ${context.meeting_date}`,
    `Deelnemers: ${context.participants.join(", ")}`,
  ].join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    maxRetries: 3,
    schema: NeedsScannerOutputSchema,
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
        content: `${contextPrefix}\n\n--- SAMENVATTING ---\n${summary}`,
      },
    ],
  });

  return object;
}

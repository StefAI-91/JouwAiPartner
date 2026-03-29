import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ExtractorOutputSchema, ExtractorOutput } from "@/lib/validations/extractor";

export type { ExtractorOutput };

const MEETING_TYPE_INSTRUCTIONS: Record<string, string> = {
  client_call: `Focus extra op:
- NEEDS: klantbehoeften, wensen, pijnpunten, gevraagde features
- INSIGHTS met metadata.category = "client_feedback" of "market_signal"
- ACTION_ITEMS met scope "project" en het juiste project
- Metadata bij needs: {client, urgency: "high"|"medium"|"low"}`,

  strategy: `Focus extra op:
- DECISIONS: strategische besluiten, richting, prioriteiten
- INSIGHTS met metadata.category = "strategic" of "risk"
- Langetermijn-implicaties en risico's`,

  standup: `Focus extra op:
- ACTION_ITEMS: wie doet wat, blokkades
- Korte, concrete items. Geen algemeenheden.
- Metadata bij action_items: {assignee, deadline, scope, project}`,

  sprint_review: `Focus extra op:
- DECISIONS over sprint/project voortgang
- ACTION_ITEMS voor volgende sprint
- INSIGHTS over wat goed ging en wat beter kan`,

  one_on_one: `Focus extra op:
- ACTION_ITEMS: afspraken, follow-ups
- INSIGHTS met metadata.category = "people" of "growth"
- Persoonlijke ontwikkelpunten`,
};

const SYSTEM_PROMPT = `Je bent de Extractor: je haalt gestructureerde informatie uit meeting transcripten.
ALLE output moet in het Nederlands zijn (behalve enum-waarden en exacte quotes uit Engels transcript).

Je extraheert 4 types:
1. DECISION — Een concreet besluit dat is genomen. Metadata: {made_by: string}
2. ACTION_ITEM — Een concrete taak/actie. Metadata: {assignee: string, deadline: string|null, scope: "project"|"personal", project: string|null}
3. NEED — Een behoefte of wens (vooral bij klantgesprekken). Metadata: {client: string|null, urgency: "high"|"medium"|"low"}
4. INSIGHT — Een waardevol inzicht, observatie of signaal. Metadata: {category: "strategic"|"market_signal"|"client_feedback"|"technical"|"people"|"risk"|"growth"}

REGELS:
- Elke extractie MOET een transcript_ref hebben: een EXACTE quote uit het transcript die de extractie ondersteunt.
- Als je geen exacte quote kunt vinden, zet transcript_ref op null en confidence op 0.0.
- Confidence scoring:
  - 1.0: expliciet en ondubbelzinnig uitgesproken, exacte quote gevonden
  - 0.7-0.9: sterk geïmpliceerd, goede quote gevonden
  - 0.4-0.6: afgeleid/geïnterpreteerd, zwakke quote
  - 0.0: geen quote gevonden of transcript_ref matcht niet
- Wees SELECTIEF: liever 5 sterke extracties dan 15 zwakke.
- Geen trivialiteiten (smalltalk, logistiek zoals "volgende meeting om 10 uur").
- Entities: noem alle projecten en klanten/externe organisaties die besproken zijn.
- primary_project: het hoofdproject van de meeting, null als er geen duidelijk hoofdproject is.`;

/**
 * Run the Extractor agent on a meeting transcript.
 * Uses Sonnet for reasoning capability.
 */
export async function runExtractor(
  transcript: string,
  context: {
    title: string;
    meeting_type: string;
    party_type: string;
    participants: string[];
    summary: string;
  },
): Promise<ExtractorOutput> {
  const typeInstructions = MEETING_TYPE_INSTRUCTIONS[context.meeting_type] ?? "";

  const contextPrefix = [
    `Titel: ${context.title}`,
    `Type: ${context.meeting_type}`,
    `Party: ${context.party_type}`,
    `Deelnemers: ${context.participants.join(", ")}`,
    context.summary ? `Samenvatting: ${context.summary}` : null,
    typeInstructions ? `\n--- TYPE-SPECIFIEKE INSTRUCTIES ---\n${typeInstructions}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: ExtractorOutputSchema,
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

  // Post-process: validate transcript_ref + clamp confidence
  for (const extraction of object.extractions) {
    // Clamp confidence to 0.0–1.0 (Anthropic API doesn't support min/max in schema)
    extraction.confidence = Math.max(0, Math.min(1, extraction.confidence));

    if (extraction.transcript_ref) {
      const refLower = extraction.transcript_ref.toLowerCase();
      const transcriptLower = transcript.toLowerCase();
      if (!transcriptLower.includes(refLower)) {
        // Transcript ref not found — set confidence to 0.0
        extraction.confidence = 0.0;
      }
    }
  }

  return object;
}

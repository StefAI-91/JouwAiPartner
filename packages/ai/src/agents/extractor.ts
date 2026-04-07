import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ExtractorOutputSchema, ExtractorOutput } from "../validations/extractor";

export type { ExtractorOutput };

const MEETING_TYPE_INSTRUCTIONS: Record<string, string> = {
  // Intern
  strategy: `Focus op acties die voortkomen uit strategische besluiten. Wie moet wat uitzoeken, opleveren, voorbereiden?`,

  one_on_one: `Focus op persoonlijke afspraken, follow-ups, en ontwikkelacties.`,

  team_sync: `Focus op wie doet wat, blokkades die opgelost moeten worden, en concrete deliverables. Metadata: {assignee, deadline, scope, project}`,

  // Extern
  discovery: `Focus op acties die voortkomen uit het gesprek: wat moeten wij uitzoeken, voorbereiden, of opleveren? Wat moet de klant aanleveren?`,

  sales: `Focus op commerciële vervolgacties: offerte sturen, demo plannen, informatie aanleveren.`,

  project_kickoff: `Focus op project-acties: wie levert wat op, eerste milestones, setup-taken. Metadata: {assignee, deadline, scope: "project", project}`,

  status_update: `Focus op blokkade-oplossingen en vervolgstappen. Wat moet er gebeuren voor de volgende statusupdate?`,

  collaboration: `Focus op wederzijdse acties: wat doet elke partij als vervolgstap?`,
};

const SYSTEM_PROMPT = `Je bent de Extractor: je haalt concrete actiepunten uit meeting transcripten.
ALLE output moet in het Nederlands zijn (behalve enum-waarden en exacte quotes uit Engels transcript).

Je extraheert ALLEEN actiepunten (action items):
- Concrete taken die iemand moet uitvoeren
- Met metadata: {assignee, deadline, scope: "project"|"personal", project}
- Geen besluiten, behoeften, of inzichten — die zitten in de samenvatting

REGELS:
- Elke extractie MOET een transcript_ref hebben: een EXACTE quote uit het transcript die de actie ondersteunt.
- Als je geen exacte quote kunt vinden, zet transcript_ref op null en confidence op 0.0.
- Confidence scoring:
  - 1.0: expliciet en ondubbelzinnig uitgesproken, exacte quote gevonden
  - 0.7-0.9: sterk geïmpliceerd, goede quote gevonden
  - 0.4-0.6: afgeleid/geïnterpreteerd, zwakke quote
  - 0.0: geen quote gevonden of transcript_ref matcht niet
- Wees SELECTIEF: liever 3 sterke actiepunten dan 10 zwakke.
- Geen trivialiteiten (smalltalk, logistiek zoals "volgende meeting om 10 uur").
- Entities: noem alle klanten/externe organisaties die besproken zijn.
- Project-toewijzing per extractie: gebruik ALLEEN de aangeleverde projectnamen. Voeg GEEN nieuwe projectnamen toe. Gebruik null als een extractie niet bij een project past.`;

/**
 * Run the Extractor agent on a meeting transcript.
 * Uses Sonnet for reasoning capability — extracts only action items.
 */
export async function runExtractor(
  transcript: string,
  context: {
    title: string;
    meeting_type: string;
    party_type: string;
    participants: string[];
    summary: string;
    identified_projects?: { project_name: string; project_id: string | null }[];
  },
): Promise<ExtractorOutput> {
  const typeInstructions = MEETING_TYPE_INSTRUCTIONS[context.meeting_type] ?? "";

  // Build project constraint section if projects are identified
  let projectConstraint = "";
  if (context.identified_projects && context.identified_projects.length > 0) {
    const projectList = context.identified_projects.map((p) => `- ${p.project_name}`).join("\n");
    projectConstraint =
      `\n\n--- PROJECT-CONSTRAINT ---\n` +
      `De volgende projecten zijn geidentificeerd in deze meeting:\n${projectList}\n\n` +
      `Gebruik ALLEEN deze projectnamen bij het toewijzen van een project aan extracties. ` +
      `Als een extractie niet bij een van deze projecten hoort, laat project dan null. ` +
      `Voeg GEEN nieuwe projectnamen toe. Je mag null toewijzen als je vindt dat een extractie ` +
      `niet bij een project past, ook al staat het project in de lijst.`;
  }

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
    model: anthropic("claude-sonnet-4-5-20250929"),
    maxRetries: 3,
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
        content: `${contextPrefix}${projectConstraint}\n\n--- TRANSCRIPT ---\n${transcript}`,
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

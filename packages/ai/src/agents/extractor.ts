import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ExtractorOutputSchema, ExtractorOutput } from "../validations/extractor";
import { withAgentRun } from "./run-logger";

const MODEL = "claude-sonnet-4-5-20250929";

export type { ExtractorOutput };

const MEETING_TYPE_INSTRUCTIONS: Record<string, string> = {
  // Intern
  strategy: `Focus op afspraken waar iemand extern iets moet aanleveren of waar een beslissing nog openstaat die je kunt opvolgen.`,

  one_on_one: `Focus op toezeggingen aan derden die je kunt opvolgen per mail. Interne persoonlijke ontwikkeldoelen zijn GEEN actiepunten.`,

  team_sync: `Focus op externe afhankelijkheden: wat wacht het team op van klanten of partners? Interne taken (wie bouwt wat) zijn GEEN actiepunten.`,

  // Extern
  discovery: `Focus op wat de klant moet aanleveren of terugkoppelen. Interne voorbereidingstaken zijn GEEN actiepunten.`,

  sales: `Focus op commerciële opvolging richting de klant: wachten op akkoord, informatie die zij moeten aanleveren, beslissingen die zij moeten nemen.`,

  project_kickoff: `Focus op externe afhankelijkheden en klant-leveringen. Interne setup-taken zijn GEEN actiepunten.`,

  status_update: `Focus op blokkades door externe partijen. Interne vervolgstappen zijn GEEN actiepunten.`,

  collaboration: `Focus op acties van de andere partij die je kunt opvolgen per mail.`,
};

const SYSTEM_PROMPT = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts/extractor.md"),
  "utf8",
).trimEnd();

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
    /** Formatted speaker names with labels (INTERN/EXTERN/ONBEKEND) from Fireflies */
    speakerContext?: string | null;
    summary: string;
    meeting_date: string;
    identified_projects?: { project_name: string; project_id: string | null }[];
    entityContext?: string;
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

  // Use speaker context (rich names with labels) when available, fall back to raw participants
  const deelnemersSection = context.speakerContext
    ? `Deelnemers (uit transcript):\n${context.speakerContext}`
    : `Deelnemers: ${context.participants.join(", ")}`;

  const contextPrefix = [
    `Titel: ${context.title}`,
    `Type: ${context.meeting_type}`,
    `Party: ${context.party_type}`,
    `Meetingdatum: ${context.meeting_date}`,
    deelnemersSection,
    context.summary ? `Samenvatting: ${context.summary}` : null,
    typeInstructions ? `\n--- TYPE-SPECIFIEKE INSTRUCTIES ---\n${typeInstructions}` : null,
    context.entityContext
      ? `\n--- BEKENDE PERSONEN & ENTITEITEN (uit database) ---\n${context.entityContext}\nGebruik deze namen voor het assignee-veld. Gebruik de EXACTE schrijfwijze uit deze lijst.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return withAgentRun({ agent_name: "extractor", model: MODEL }, async () => {
    const { object, usage } = await generateObject({
      model: anthropic(MODEL),
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

    return { result: object, usage };
  });
}

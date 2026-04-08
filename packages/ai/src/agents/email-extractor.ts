import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { EmailExtractorOutputSchema, EmailExtractorOutput } from "../validations/email-extractor";

export type { EmailExtractorOutput };

const SYSTEM_PROMPT = `Je bent de Email Extractor: je haalt belangrijke inzichten uit emails die relevant zijn voor projecten van Jouw AI Partner.
ALLE output moet in het Nederlands zijn (behalve enum-waarden).

Je extraheert de volgende types:
- decision: een besluit dat genomen of bevestigd wordt
- action_item: iets dat iemand moet doen (JAIP-team of extern)
- need: iets dat ontbreekt of blokkerend is
- insight: nuttige informatie of context voor het project
- project_update: statusupdate, voortgang, milestone
- request: een expliciet verzoek van de afzender

--- REGELS ---
- Wees SELECTIEF: liever 2-3 sterke extracties dan 8 zwakke
- Focus op wat ACTIONABLE of INFORMATIEF is voor het JAIP-team
- Sla over: standaard beleefdheidsformules, handtekeningen, disclaimers
- source_ref: relevante quote uit de email body. Null als niet van toepassing
- Confidence scoring:
  - 1.0: expliciet en ondubbelzinnig
  - 0.7-0.9: sterk geïmpliceerd
  - 0.4-0.6: afgeleid/geïnterpreteerd
  - <0.4: speculatief — laat liever weg
- Urgency: baseer op toon, deadlines, en woorden als "dringend", "ASAP", "voor vrijdag"
- Project: gebruik ALLEEN de aangeleverde projectnamen. Null als geen match
- Summary: één korte Nederlandse zin die de kern van de email samenvat`;

/**
 * Run the Email Extractor agent on an email.
 * Uses Sonnet for reasoning capability — extracts insights, decisions, action items.
 */
export async function runEmailExtractor(
  email: {
    subject: string | null;
    from_address: string;
    from_name: string | null;
    to_addresses: string[];
    body_text: string | null;
    snippet: string;
    date: string;
  },
  context: {
    identified_projects?: { project_name: string; project_id: string | null }[];
    organization_name?: string | null;
    email_type?: string;
    entityContext?: string;
  } = {},
): Promise<EmailExtractorOutput> {
  const emailInfo = [
    `Onderwerp: ${email.subject ?? "(geen onderwerp)"}`,
    `Van: ${email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address}`,
    `Aan: ${email.to_addresses.join(", ")}`,
    `Datum: ${email.date}`,
    context.organization_name ? `Organisatie: ${context.organization_name}` : null,
    context.email_type ? `Categorie: ${context.email_type}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  let projectConstraint = "";
  if (context.identified_projects && context.identified_projects.length > 0) {
    const projectList = context.identified_projects.map((p) => `- ${p.project_name}`).join("\n");
    projectConstraint =
      `\n\n--- PROJECT-CONSTRAINT ---\n` +
      `De volgende projecten zijn geïdentificeerd:\n${projectList}\n\n` +
      `Gebruik ALLEEN deze projectnamen. Null als een extractie niet bij een project past.`;
  }

  const entitySection = context.entityContext
    ? `\n\n--- BEKENDE PERSONEN & ENTITEITEN ---\n${context.entityContext}`
    : "";

  const body = email.body_text ? email.body_text.slice(0, 6000) : email.snippet;

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5-20250929"),
    maxRetries: 3,
    schema: EmailExtractorOutputSchema,
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
        content: `${emailInfo}${projectConstraint}${entitySection}\n\n--- EMAIL BODY ---\n${body}`,
      },
    ],
  });

  // Post-process: clamp confidence
  for (const extraction of object.extractions) {
    extraction.confidence = Math.max(0, Math.min(1, extraction.confidence));
  }

  return object;
}

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { EmailClassifierSchema, EmailClassifierOutput } from "../validations/email-classifier";

export type { EmailClassifierOutput };

const SYSTEM_PROMPT = `Je bent de Email Classifier: je classificeert inkomende emails en matcht ze aan projecten.
ALLE output moet in het Nederlands zijn (behalve enum-waarden en project_id UUIDs).

Je bepaalt:
1. RELEVANTIE-SCORE (0.0–1.0): hoe waardevol is deze email voor het bedrijf?
   - 0.0–0.2: ruis (newsletters, notificaties, spam)
   - 0.3–0.5: beperkt relevant (administratief, algemene info)
   - 0.6–0.8: relevant (project communicatie, klant updates)
   - 0.9–1.0: kritiek (besluiten, urgente verzoeken, contracten)

2. EMAIL CATEGORY: wat voor soort email is dit?
   - project_communication: directe project-gerelateerde communicatie
   - sales: commercieel, offerte, propositie
   - internal: intern overleg, team communicatie
   - administrative: facturen, contracten, planning
   - newsletter: nieuwsbrieven, marketing
   - notification: automated notificaties (GitHub, Vercel, etc.)
   - other: past echt nergens in

3. ORGANIZATION NAME: welke externe organisatie is betrokken?
   - null als het een interne email is

4. PROJECT-IDENTIFICATIE: welke projecten worden in deze email besproken?
   - Match alleen aan bekende projecten als je daar zeker van bent
   - Als een project besproken wordt dat niet in de lijst staat, geef de naam met project_id: null
   - Liever null dan een foute koppeling

BELANGRIJK: Je doet GEEN extractie van inhoud. Je classificeert alleen.`;

/**
 * Run the Email Classifier agent on an email.
 * Uses Haiku for fast, cost-effective classification (same as meeting Gatekeeper).
 */
export async function runEmailClassifier(
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
    entityContext?: string;
  } = {},
): Promise<EmailClassifierOutput> {
  const emailInfo = [
    `Onderwerp: ${email.subject ?? "(geen onderwerp)"}`,
    `Van: ${email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address}`,
    `Aan: ${email.to_addresses.join(", ")}`,
    `Datum: ${email.date}`,
  ].join("\n");

  const body = email.body_text ? email.body_text.slice(0, 4000) : email.snippet;

  const entitySection = context.entityContext ? `\n\n${context.entityContext}` : "";

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    maxRetries: 3,
    schema: EmailClassifierSchema,
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
        content: `${emailInfo}${entitySection}\n\n--- EMAIL BODY ---\n${body}`,
      },
    ],
  });

  return object;
}

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

2. EMAIL TYPE: wat voor soort email is dit?
   - project_communication: directe project-gerelateerde communicatie
   - sales: ONZE eigen uitgaande sales (wij benaderen een prospect, offertes, propositie aan klanten)
   - cold_outreach: ongevraagde commerciële outreach NAAR ons (recruiters, SaaS-verkopers, agencies, consultants die hun diensten aanbieden, lead-gen spam, marketing emails die openen met "Herken je deze symptomen?" of "Wil je een gratis demo?")
   - internal: intern overleg, team communicatie
   - administrative: planning, algemeen administratief, account-mutaties, wachtwoord-resets
   - legal_finance: facturen, boekhouding, belastingzaken, contracten, juridisch advies
   - newsletter: nieuwsbrieven, marketing-mailings, content-digests ("Deze week bij...", "Nieuwsbrief X")
   - notification: automated notificaties van tools — Slack mentions, GitHub PR/issue updates, Vercel/Netlify builds, Userback bug-alerts, Supabase alerts, calendar invites, Adyen/Stripe billing-summaries, usage-reports, security-alerts, password-resets, login-notifications. ALS afzender begint met no-reply@, noreply@, notifications@, alerts@, mailer@ → ALTIJD notification. ALS subject bevat "Weekly Usage Summary", "You have a new mention", "New Bug created", "Build succeeded/failed" → ALTIJD notification.
   - other: past echt nergens in

   LET OP legal_finance: emails van/naar boekhouders, fiscalisten, advocaten, of over financiële/juridische zaken krijgen ALTIJD legal_finance als category.
   LET OP cold_outreach: als de afzender onbekend is en ons iets probeert te verkopen/aanbieden → cold_outreach, niet sales.
   LET OP notification: een geautomatiseerde email van een tool is ALTIJD notification, ook als de inhoud over een project gaat (bv. GitHub PR-mail of Slack mention in een project-kanaal).

3. PARTY TYPE: welke rol heeft de afzender/belangrijkste externe partij?
   - internal: afzender is een intern teamlid (check of naam/email in de bekende personen staat met een team)
   - client: afzender is een klant
   - accountant: afzender is een boekhouder (check rol in bekende personen)
   - tax_advisor: afzender is een fiscalist/belastingadviseur (check rol in bekende personen)
   - lawyer: afzender is een advocaat/jurist
   - partner: afzender is van een partnerorganisatie
   - other: anders of onbekend

   BELANGRIJK: Gebruik de bekende personen lijst om de afzender te identificeren. Match op naam of email-adres. Als een persoon de rol "boekhouder" heeft → accountant. Rol "fiscalist" → tax_advisor.

4. ORGANIZATION NAME: welke externe organisatie is betrokken?
   - null als het een interne email is

5. PROJECT-IDENTIFICATIE: welke projecten worden in deze email besproken?
   - Match alleen aan bekende projecten als je daar zeker van bent
   - Als een project besproken wordt dat niet in de lijst staat, geef de naam met project_id: null
   - Liever null dan een foute koppeling
   - Projectkoppeling is OPTIONEEL — niet elke email hoort bij een project

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

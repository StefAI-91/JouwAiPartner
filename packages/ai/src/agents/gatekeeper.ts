import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { GatekeeperSchema, GatekeeperOutput } from "../validations/gatekeeper";

export type { GatekeeperOutput };

const SYSTEM_PROMPT = `Je bent de Gatekeeper: je classificeert meetings en identificeert projecten. Je extraheert NIETS.
ALLE output moet in het Nederlands zijn (behalve enum-waarden en project_id UUIDs).

Je krijgt een deelnemerslijst met labels: INTERN, EXTERN, of ONBEKEND.
Gebruik deze labels als feit — raad niet zelf wie intern of extern is.

Je bepaalt:
1. RELEVANTIE-SCORE (0.0–1.0): hoe waardevol is deze meeting voor het bedrijf?
   - 0.0–0.3: ruis (small talk, testgesprekken)
   - 0.4–0.5: beperkt relevant (algemene info)
   - 0.6–0.8: relevant (concrete inhoud, updates)
   - 0.9–1.0: kritiek (besluiten, strategie, klantafspraken)

2. MEETING TYPE: wat voor soort meeting is dit?
   Kies het type dat het BESTE past. Gebruik de deelnemerslabels (INTERN/EXTERN) als leidraad.

   INTERN (alle deelnemers zijn INTERN):
   - board: bestuurlijk overleg waarbij alle deelnemers admin zijn (Stef, Wouter). Strategische, financiële of operationele beslissingen op directieniveau.
   - strategy: strategieoverleg, roadmap, visie, langetermijnbeslissingen. Kenmerken: er worden richtinggevende keuzes gemaakt of bediscussieerd.
   - one_on_one: 1-op-1 gesprek tussen twee interne collega's. Kenmerken: precies 2 deelnemers, persoonlijk of operationeel.
   - team_sync: overige interne afstemming (standup, weekly, sprint review). Kenmerken: 3+ interne deelnemers, operationeel, voortgangsbespreking.

   EXTERN (minstens één EXTERNE deelnemer):
   - discovery: EERSTE verkennende call, kennismaking, behoeften ophalen. Kenmerken: partijen leren elkaar kennen, er is nog geen lopend project of offerte.
   - sales: commercieel gesprek waar het gaat over offerte, pricing, scope, of contractvoorwaarden. Kenmerken: er wordt gepraat over geld, voorwaarden, of een voorstel.
   - project_kickoff: start/oplevering van een nieuw project of fase. Kenmerken: rolverdeling, planning, scope-afspraken aan het begin.
   - status_update: voortgangsoverleg over een lopend project. Kenmerken: er IS al een project, bespreking van wat af is, wat loopt, blokkades.
   - collaboration: gelijkwaardige samenwerking of partnership-bespreking. Kenmerken: geen klant-leverancier verhouding, beide partijen brengen iets in.

   FALLBACK:
   - other: past echt nergens in (bijv. testgesprek, onherkenbare inhoud)

3. ORGANIZATION NAME: welke externe organisatie was betrokken?
   - Geef de organisatienaam als er ONBEKENDE externe deelnemers zijn
   - null als alle deelnemers INTERN zijn of als de organisatie al bekend is (EXTERN label bevat org)

4. PROJECT-IDENTIFICATIE: welke projecten worden in deze meeting besproken?
   - Je krijgt een lijst met bekende projecten (inclusief aliassen en organisatie).
   - Als een besproken project matcht met een bekend project, gebruik dan het bijbehorende project_id.
   - Als een project besproken wordt dat NIET in de lijst staat, geef dan de naam uit het transcript met project_id: null.
   - Geef per project een confidence score (0.0-1.0).
   - Als er geen projecten besproken worden, retourneer een lege array.

   Match alleen aan bekende projecten als je daar zeker van bent. Als een project wordt besproken dat niet in de lijst staat, geef dan de naam uit het transcript met project_id: null. Verzin geen match -- liever null dan een foute koppeling.

BELANGRIJK: Je doet GEEN extractie van besluiten, actiepunten of andere inhoud.
Je classificeert en identificeert alleen. Party type wordt NIET door jou bepaald.`;

export interface ParticipantInfo {
  raw: string;
  label: "internal" | "external" | "unknown";
  matchedName?: string;
  organizationName?: string | null;
  organizationType?: string | null;
  /** True wanneer deze persoon gekoppeld is aan een profiles-row met role='admin' (sprint 035). */
  isAdmin?: boolean;
}

export async function runGatekeeper(
  notes: string,
  metadata: {
    title?: string;
    participants?: ParticipantInfo[];
    date?: string;
    topics?: string[];
    entityContext?: string;
  },
): Promise<GatekeeperOutput> {
  const participantLines = metadata.participants?.length
    ? metadata.participants
        .map((p) => {
          const name = p.matchedName ?? p.raw;
          if (p.label === "internal") return `- ${name} (INTERN)`;
          if (p.label === "external") {
            const orgSuffix = p.organizationName ? ` - ${p.organizationName}` : "";
            return `- ${name} (EXTERN${orgSuffix})`;
          }
          return `- ${name} (ONBEKEND)`;
        })
        .join("\n")
    : null;

  const contextPrefix = [
    metadata.title ? `Titel: ${metadata.title}` : null,
    participantLines ? `Deelnemers:\n${participantLines}` : null,
    metadata.date ? `Datum: ${metadata.date}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const topicsSection = metadata.topics?.length
    ? `\n\nBesproken onderwerpen:\n${metadata.topics.join(", ")}`
    : "";

  const entitySection = metadata.entityContext ? `\n\n${metadata.entityContext}` : "";

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    maxRetries: 3,
    schema: GatekeeperSchema,
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
        content: `${contextPrefix}${topicsSection}${entitySection}\n\nMeeting Notes:\n${notes}`,
      },
    ],
  });

  return object;
}

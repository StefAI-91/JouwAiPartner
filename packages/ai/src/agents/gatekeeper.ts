import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { GatekeeperSchema, GatekeeperOutput } from "../validations/gatekeeper";

export type { GatekeeperOutput };

const SYSTEM_PROMPT = `Je bent de Gatekeeper: je classificeert meetings. Je extraheert NIETS.
ALLE output moet in het Nederlands zijn (behalve enum-waarden).

Je krijgt een deelnemerslijst met labels: INTERN, EXTERN, of ONBEKEND.
Gebruik deze labels als feit — raad niet zelf wie intern of extern is.

Je bepaalt:
1. RELEVANTIE-SCORE (0.0–1.0): hoe waardevol is deze meeting voor het bedrijf?
   - 0.0–0.3: ruis (small talk, testgesprekken)
   - 0.4–0.5: beperkt relevant (algemene info)
   - 0.6–0.8: relevant (concrete inhoud, updates)
   - 0.9–1.0: kritiek (besluiten, strategie, klantafspraken)

2. MEETING TYPE: wat voor soort meeting is dit?
   INTERN:
   - strategy: strategieoverleg, roadmap, visie
   - one_on_one: 1-op-1 gesprekken
   - team_sync: overige interne afstemming
   EXTERN:
   - discovery: verkennende call, kennismaking, kijken of je iets voor elkaar kunt betekenen
   - sales: commercieel gesprek, offerte, onderhandeling
   - project_kickoff: start van een nieuw project
   - status_update: voortgangsoverleg, tussentijdse check
   - collaboration: samenwerkingsbespreking, partnership
   FALLBACK:
   - other: past echt nergens in

3. PARTY TYPE: met wie was de meeting?
   - Als ALLE deelnemers INTERN zijn → party_type = "internal"
   - Als er EXTERNE deelnemers zijn, bepaal op basis van relatie:
     - client: meeting met een (potentiële) klant
     - partner: meeting met een partner/leverancier
     - other: onduidelijk

4. ORGANIZATION NAME: welke externe organisatie was betrokken?
   - Geef de organisatienaam als het een client/partner meeting is
   - null als het een interne meeting is

BELANGRIJK: Je doet GEEN extractie van besluiten, actiepunten of andere inhoud.
Je classificeert alleen.`;

export interface ParticipantInfo {
  raw: string;
  label: "internal" | "external" | "unknown";
  matchedName?: string;
  organizationName?: string | null;
}

export async function runGatekeeper(
  notes: string,
  metadata: {
    title?: string;
    participants?: ParticipantInfo[];
    date?: string;
    topics?: string[];
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

  const allInternal = metadata.participants?.every((p) => p.label === "internal") ?? false;

  const contextPrefix = [
    metadata.title ? `Titel: ${metadata.title}` : null,
    participantLines ? `Deelnemers:\n${participantLines}` : null,
    allInternal ? `OPMERKING: Alle deelnemers zijn intern. party_type moet "internal" zijn.` : null,
    metadata.date ? `Datum: ${metadata.date}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const topicsSection = metadata.topics?.length
    ? `\n\nBesproken onderwerpen:\n${metadata.topics.join(", ")}`
    : "";

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
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
        content: `${contextPrefix}${topicsSection}\n\nMeeting Notes:\n${notes}`,
      },
    ],
  });

  return object;
}

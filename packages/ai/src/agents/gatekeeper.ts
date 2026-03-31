import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { GatekeeperSchema, GatekeeperOutput } from "../validations/gatekeeper";

export type { GatekeeperOutput };

const SYSTEM_PROMPT = `Je bent de Gatekeeper: je classificeert meetings. Je extraheert NIETS.
ALLE output moet in het Nederlands zijn (behalve enum-waarden).

Je bepaalt:
1. RELEVANTIE-SCORE (0.0–1.0): hoe waardevol is deze meeting voor het bedrijf?
   - 0.0–0.3: ruis (small talk, testgesprekken)
   - 0.4–0.5: beperkt relevant (algemene info)
   - 0.6–0.8: relevant (concrete inhoud, updates)
   - 0.9–1.0: kritiek (besluiten, strategie, klantafspraken)

2. MEETING TYPE: wat voor soort meeting is dit?
   - standup, sprint_review, strategy, client_call, internal, one_on_one, other

3. PARTY TYPE: met wie was de meeting?
   - client: meeting met een klant
   - partner: meeting met een partner/leverancier
   - internal: alleen intern team
   - other: overig

4. ORGANIZATION NAME: welke externe organisatie was betrokken?
   - Geef de organisatienaam als het een client/partner meeting is
   - null als het een interne meeting is

BELANGRIJK: Je doet GEEN extractie van besluiten, actiepunten of andere inhoud.
Je classificeert alleen.`;

export async function runGatekeeper(
  notes: string,
  metadata: {
    title?: string;
    participants?: string[];
    date?: string;
    topics?: string[];
  },
): Promise<GatekeeperOutput> {
  const contextPrefix = [
    metadata.title ? `Titel: ${metadata.title}` : null,
    metadata.participants?.length ? `Deelnemers: ${metadata.participants.join(", ")}` : null,
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

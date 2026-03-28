import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { GatekeeperSchema, GatekeeperOutput } from "@/lib/validations/gatekeeper";

export type { GatekeeperOutput };

const SYSTEM_PROMPT = `Je ontvangt meeting notes en metadata. Beoordeel en extraheer het volgende.
ALLE output moet in het Nederlands zijn.

BEOORDELING:
- Relevantie-score (0.0 - 1.0)
- Actie: pass (≥0.6) of reject (<0.6)

EXTRACTIE:
1. BESLUITEN — wat is er concreet besloten? Door wie?
2. ACTIEPUNTEN — schrijf duidelijke, concrete actiepunten op basis van de notes.
   - Formuleer als: "[Persoon] moet [concrete actie] [deadline indien genoemd]"
   - Koppel aan een project als het projectgerelateerd is
   - Markeer als "persoonlijk" als het niet bij een project hoort
3. PROJECTUPDATES — welke projecten zijn besproken, wat is de status?
4. STRATEGIE & IDEEËN — nieuwe richtingen of brainstorms?
5. KLANTINFO — wat is er gezegd over of namens klanten?

ENTITEITEN:
- Personen die worden genoemd
- Projecten die worden besproken
- Klanten die ter sprake komen
- Onderwerpen/thema's

Wees streng bij de beoordeling: alleen inhoud met duidelijke bedrijfswaarde krijgt score >= 0.6.
Small talk, greetings en irrelevante gesprekken krijgen een lage score.
Als je twijfelt over extractie, laat het veld leeg in plaats van te gokken.`;

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
    system: SYSTEM_PROMPT,
    prompt: `${contextPrefix}${topicsSection}\n\nMeeting Notes:\n${notes}`,
  });

  return object;
}

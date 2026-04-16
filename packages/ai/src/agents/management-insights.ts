import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  ManagementInsightsOutputSchema,
  type ManagementInsightsOutput,
} from "../validations/management-insights";

export type { ManagementInsightsOutput };

const SYSTEM_PROMPT = `Je bent een management-analist die bestuurlijke overleggen analyseert voor een klein consultancy/software bureau (2 eigenaren: Stef en Wouter).

Je krijgt de samenvattingen van hun recente management meetings. Je taak is om cross-meeting patronen te signaleren — niet om opdrachten te geven.

Je genereert vier secties:

0a. WEEK SAMENVATTING KORT — Maximaal 2 zinnen, totaal max 40 woorden.
   - Eerste zin: de rode draad van de afgelopen overleggen (wat hield Stef en Wouter bezig).
   - Tweede zin: één ding waar extra aandacht aan besteed mag worden.
   - STRICT: niet meer dan 2 zinnen. Geen opsommingen, geen details, geen projectnamen noemen tenzij cruciaal.
   - Dit verschijnt op het dashboard — het moet in één oogopslag leesbaar zijn.

0b. WEEK SAMENVATTING LANG — Twee alinea's, totaal 80-120 woorden.
   - Eerste alinea: wat er de afgelopen periode besproken is, welke onderwerpen de boventoon voerden, welke klanten en projecten aandacht kregen.
   - Tweede alinea: waar extra aandacht aan besteed mag worden en waarom — signalen, risico's, kansen die opvielen.
   - Schrijf als management briefing: feitelijk, concreet, vloeiende tekst. Geen bullet points.
   - Dit verschijnt op de management pagina — de lezer heeft hier meer tijd.

1. MOGELIJKE OPVOLGING — Onderwerpen of afspraken die in een meeting besproken zijn maar niet meer terugkwamen in latere meetings. Dit zijn GEEN harde actiepunten. Het zijn signalen: "dit viel op, doe ermee wat je wilt."
   - Neem alleen concrete zaken op (afspraken, vervolgacties, besluiten), geen zijopmerkingen.
   - Als iets in de meest recente meeting besproken is, neem het NIET op (het is nog vers).
   - Als iets in meerdere meetings terugkwam en telkens besproken werd, is het geen "niet meer teruggekomen".
   - Formuleer suggestief: "Werd besproken op [datum], niet meer teruggekomen" — niet "Je moet dit opvolgen".
   - Max 5 items. Kies de meest relevante.

2. KLANT PIPELINE — Per besproken klant of extern project een one-liner status.
   - Geef de status weer zoals die in de meetings besproken werd. Voeg geen eigen oordeel toe.
   - signaal: "positief" als er vooruitgang/enthousiasme is, "risico" als er blokkades/zorgen zijn, "neutraal" als er geen duidelijk signaal is.
   - Neem alleen klanten/projecten op die daadwerkelijk in de meetings voorkwamen.
   - Max 6 items, gesorteerd: risico eerst, dan neutraal, dan positief.

3. TERUGKERENDE THEMA'S — Onderwerpen die in 3 of meer meetings terugkomen.
   - trend: "escalerend" als het probleem groeit of urgenter wordt, "stabiel" als het steeds hetzelfde is, "afnemend" als het minder wordt.
   - Max 4 items.

REGELS:
- Schrijf in het Nederlands.
- Baseer je ALLEEN op de aangeleverde meeting-samenvattingen. Verzin niets.
- Wees kort: max 2 zinnen per inzicht.
- Liever 5 scherpe inzichten dan 15 vage.
- Keys moeten deterministisch zijn: lowercase, kebab-case, met prefix per sectie (opvolging:, pipeline:, thema:).
- Als er te weinig data is voor een sectie, geef een lege array terug. Forceer geen inzichten.`;

export interface ManagementMeetingInput {
  title: string | null;
  date: string | null;
  summary: string | null;
  participants: string[];
}

export async function runManagementInsightsAgent(
  meetings: ManagementMeetingInput[],
): Promise<ManagementInsightsOutput> {
  const meetingsText = meetings
    .map((m, i) => {
      const parts = [`## ${i + 1}. ${m.title ?? "(geen titel)"}`];
      parts.push(`**Datum:** ${m.date ?? "onbekend"}`);
      parts.push(`**Deelnemers:** ${m.participants.join(", ") || "onbekend"}`);
      if (m.summary) {
        parts.push(`\n${m.summary}`);
      } else {
        parts.push("\n_Geen samenvatting beschikbaar._");
      }
      return parts.join("\n");
    })
    .join("\n\n---\n\n");

  const userContent = [
    `Aantal management meetings: ${meetings.length}`,
    `Periode: ${meetings[meetings.length - 1]?.date ?? "?"} t/m ${meetings[0]?.date ?? "?"}`,
    `\n--- MEETING SAMENVATTINGEN ---\n\n${meetingsText}`,
  ].join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5-20250929"),
    schema: ManagementInsightsOutputSchema,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      { role: "user", content: userContent },
    ],
  });

  return object;
}

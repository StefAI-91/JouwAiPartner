import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  ProjectSummaryOutputSchema,
  OrgSummaryOutputSchema,
  type ProjectSummaryOutput,
  type OrgSummaryOutput,
} from "../validations/project-summary";

export type { ProjectSummaryOutput, OrgSummaryOutput };

const PROJECT_SYSTEM_PROMPT = `Je bent een project-analist. Je genereert twee soorten samenvattingen op basis van verified extracties uit meetings.

1. CONTEXT — Een neutrale projectbeschrijving voor iemand die het project niet kent.
   Focus op: wat is het project, wie is de klant, welke technologie/aanpak, scope, wie werkt eraan, wanneer moet het af.
   Max 4-5 zinnen. Geen meningen, geen risico's, geen aanbevelingen. Puur feitelijk.

2. BRIEFING — Een forward-looking analyse voor het actieve team.
   Focus op: voortgang vs. deadline, openstaande actiepunten en hun status, risico's en blokkades, wat het team deze week zou moeten doen.
   Max 4-5 zinnen. Wees direct en actiegericht. Noem concrete namen, datums en items.
   Als er risico's zijn, geef een concrete aanbeveling.

REGELS:
- Schrijf in het Nederlands.
- Baseer je ALLEEN op de aangeleverde extracties. Verzin niets.
- Als er weinig data is, wees dan kort. Liever 2 goede zinnen dan 5 vage.`;

const ORG_SYSTEM_PROMPT = `Je bent een klant-analist. Je genereert twee soorten samenvattingen over een organisatie op basis van verified extracties uit meetings.

1. CONTEXT — Een neutrale beschrijving van de organisatie.
   Focus op: wie is de klant, wat voor bedrijf, relatie met ons, lopende projecten, contactpersoon.
   Max 3-4 zinnen. Puur feitelijk.

2. BRIEFING — Een klant-analyse voor het team.
   Focus op: klant-sentiment, aandachtspunten, openstaande behoeften, risico's in de relatie.
   Max 3-4 zinnen. Actiegericht.

REGELS:
- Schrijf in het Nederlands.
- Baseer je ALLEEN op de aangeleverde extracties. Verzin niets.
- Als er weinig data is, wees dan kort.`;

interface ExtractionInput {
  type: string;
  content: string;
  meetingTitle: string | null;
  meetingDate: string | null;
}

function formatExtractions(extractions: ExtractionInput[]): string {
  if (extractions.length === 0) return "Geen extracties beschikbaar.";

  const grouped: Record<string, ExtractionInput[]> = {};
  for (const e of extractions) {
    (grouped[e.type] ??= []).push(e);
  }

  const sections: string[] = [];
  const typeLabels: Record<string, string> = {
    decision: "Besluiten",
    action_item: "Actiepunten",
    need: "Behoeften",
    insight: "Inzichten",
  };

  for (const [type, items] of Object.entries(grouped)) {
    const label = typeLabels[type] ?? type;
    const lines = items.map((i) => {
      const source = [i.meetingTitle, i.meetingDate].filter(Boolean).join(" — ");
      return `- ${i.content}${source ? ` (bron: ${source})` : ""}`;
    });
    sections.push(`### ${label}\n${lines.join("\n")}`);
  }

  return sections.join("\n\n");
}

export async function runProjectSummarizer(
  projectName: string,
  extractions: ExtractionInput[],
  existingContext?: string | null,
): Promise<ProjectSummaryOutput> {
  const extractionsText = formatExtractions(extractions);

  const userContent = [
    `Project: ${projectName}`,
    `Aantal extracties: ${extractions.length}`,
    existingContext ? `\nHuidige context samenvatting:\n${existingContext}` : "",
    `\n--- EXTRACTIES ---\n${extractionsText}`,
  ].join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    schema: ProjectSummaryOutputSchema,
    messages: [
      {
        role: "system",
        content: PROJECT_SYSTEM_PROMPT,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      { role: "user", content: userContent },
    ],
  });

  return object;
}

export async function runOrgSummarizer(
  orgName: string,
  extractions: ExtractionInput[],
  existingContext?: string | null,
): Promise<OrgSummaryOutput> {
  const extractionsText = formatExtractions(extractions);

  const userContent = [
    `Organisatie: ${orgName}`,
    `Aantal extracties: ${extractions.length}`,
    existingContext ? `\nHuidige context samenvatting:\n${existingContext}` : "",
    `\n--- EXTRACTIES ---\n${extractionsText}`,
  ].join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    schema: OrgSummaryOutputSchema,
    messages: [
      {
        role: "system",
        content: ORG_SYSTEM_PROMPT,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      { role: "user", content: userContent },
    ],
  });

  return object;
}

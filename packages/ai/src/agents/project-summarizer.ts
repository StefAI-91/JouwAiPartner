import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  ProjectSummaryOutputSchema,
  OrgSummaryOutputSchema,
  type ProjectSummaryOutput,
  type OrgSummaryOutput,
} from "../validations/project-summary";

export type { ProjectSummaryOutput, OrgSummaryOutput };

const PROJECT_SYSTEM_PROMPT = `Je bent een project-analist. Je genereert drie outputs op basis van meeting-samenvattingen die bij dit project horen.

1. CONTEXT — Een neutrale projectbeschrijving voor iemand die het project niet kent.
   Focus op: wat is het project, wie is de klant, welke technologie/aanpak, scope, wie werkt eraan, wanneer moet het af.
   Max 4-5 zinnen. Geen meningen, geen risico's, geen aanbevelingen. Puur feitelijk.

2. BRIEFING — Een forward-looking analyse voor het actieve team.
   Focus op: voortgang vs. deadline, openstaande actiepunten en hun status, risico's en blokkades, wat het team nu zou moeten doen.
   Max 4-5 zinnen. Wees direct en actiegericht. Noem concrete namen, datums en items.
   Als er risico's zijn, geef een concrete aanbeveling.

3. TIMELINE — Een chronologisch overzicht van alle meetings, van oud naar nieuw.
   Per meeting geef je:
   - date: de datum (YYYY-MM-DD)
   - meeting_type: het type meeting
   - title: de titel van de meeting
   - summary: één zin over het belangrijkste resultaat of de belangrijkste uitkomst
   - key_decisions: concrete besluiten (leeg als er geen waren)
   - open_actions: actiepunten die nog niet zijn afgerond (leeg als er geen zijn)

   De timeline vertelt het projectverhaal: hoe het project zich ontwikkelt, waar het kantelde,
   welke besluiten tot veranderingen leidden. Laat het verloop zien, niet alleen de feiten.

REGELS:
- Schrijf in het Nederlands.
- Baseer je ALLEEN op de aangeleverde meeting-samenvattingen. Verzin niets.
- Recente meetings wegen zwaarder voor de BRIEFING dan oudere.
- Als er weinig data is, wees dan kort. Liever 2 goede zinnen dan 5 vage.
- De TIMELINE bevat ALLE aangeleverde meetings, gesorteerd van oud naar nieuw.`;

const ORG_SYSTEM_PROMPT = `Je bent een klant-analist. Je genereert twee soorten samenvattingen over een organisatie op basis van meeting-samenvattingen.

1. CONTEXT — Een neutrale beschrijving van de organisatie.
   Focus op: wie is de klant, wat voor bedrijf, relatie met ons, lopende projecten, contactpersoon.
   Max 3-4 zinnen. Puur feitelijk.

2. BRIEFING — Een klant-analyse voor het team.
   Focus op: klant-sentiment, aandachtspunten, openstaande behoeften, risico's in de relatie.
   Max 3-4 zinnen. Actiegericht.

REGELS:
- Schrijf in het Nederlands.
- Baseer je ALLEEN op de aangeleverde meeting-samenvattingen. Verzin niets.
- Recente meetings wegen zwaarder voor de BRIEFING.
- Als er weinig data is, wees dan kort.`;

export interface MeetingInput {
  title: string;
  date: string | null;
  meetingType: string | null;
  briefing: string | null;
  summary: string | null;
}

export interface SegmentInput {
  meeting_title: string | null;
  meeting_date: string | null;
  kernpunten: string[];
  vervolgstappen: string[];
}

function formatMeetings(meetings: MeetingInput[]): string {
  if (meetings.length === 0) return "Geen meetings beschikbaar.";

  return meetings
    .map((m) => {
      const header = [m.title, m.date, m.meetingType].filter(Boolean).join(" — ");

      const content = m.briefing || m.summary || "Geen samenvatting beschikbaar";

      return `### ${header}\n${content}`;
    })
    .join("\n\n");
}

function formatSegments(segments: SegmentInput[]): string {
  if (segments.length === 0) return "";

  const lines = segments.map((s) => {
    const header = [s.meeting_title, s.meeting_date].filter(Boolean).join(" — ");
    const parts: string[] = [`### ${header || "Meeting"}`];
    if (s.kernpunten.length > 0) {
      parts.push("Kernpunten:");
      s.kernpunten.forEach((k) => parts.push(`- ${k}`));
    }
    if (s.vervolgstappen.length > 0) {
      parts.push("Vervolgstappen:");
      s.vervolgstappen.forEach((v) => parts.push(`- ${v}`));
    }
    return parts.join("\n");
  });

  return lines.join("\n\n");
}

export async function runProjectSummarizer(
  projectName: string,
  meetings: MeetingInput[],
  existingContext?: string | null,
  segments?: SegmentInput[],
): Promise<ProjectSummaryOutput> {
  const meetingsText = formatMeetings(meetings);
  const segmentsText = segments?.length ? formatSegments(segments) : "";

  const userContent = [
    `Project: ${projectName}`,
    `Aantal meetings: ${meetings.length}`,
    existingContext ? `\nHuidige context samenvatting:\n${existingContext}` : "",
    segmentsText
      ? `\n--- PROJECT-SPECIFIEKE KERNPUNTEN (per meeting) ---\nDit zijn de kernpunten en vervolgstappen die specifiek over dit project gaan. Gebruik deze als primaire bron — ze bevatten minder ruis dan de volledige meeting-samenvattingen.\n\n${segmentsText}`
      : "",
    `\n--- MEETING SAMENVATTINGEN ---\n${meetingsText}`,
  ].join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    maxRetries: 3,
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
  meetings: MeetingInput[],
  existingContext?: string | null,
): Promise<OrgSummaryOutput> {
  const meetingsText = formatMeetings(meetings);

  const userContent = [
    `Organisatie: ${orgName}`,
    `Aantal meetings: ${meetings.length}`,
    existingContext ? `\nHuidige context samenvatting:\n${existingContext}` : "",
    `\n--- MEETING SAMENVATTINGEN ---\n${meetingsText}`,
  ].join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    maxRetries: 3,
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

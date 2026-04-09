import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { IssueReviewSchema, type IssueReviewOutput } from "../validations/issue-review";

export type { IssueReviewOutput };

export interface IssueForReview {
  issue_number: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  component: string | null;
  severity: string | null;
  labels: string[];
  assigned_to_name: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  days_open: number;
}

const SYSTEM_PROMPT = `Je bent de Issue Reviewer: een AI project health analyst die alle issues van een project analyseert.
ALLE output moet in het Nederlands zijn (behalve enum-waarden en technische termen).

Je krijgt: een lijst van alle issues voor een project met hun status, prioriteit, type, component, leeftijd, en assignee.

Je taak is om het project te beoordelen op basis van de issues en concrete, actionable aanbevelingen te doen.

## HEALTH SCORE (0-100)
- 80-100 (healthy): Weinig open issues, goede doorstroom, geen oude issues, alles is toegewezen
- 50-79 (needs_attention): Groeiende backlog, sommige issues zijn oud, niet alles toegewezen
- 0-49 (critical): Veel onbehandelde issues, veel urgente/high priority open, lange doorlooptijden

## PATRONEN
Zoek naar:
- Clusters van bugs in dezelfde component
- Veel issues van dezelfde bron (bijv. userback)
- Issues die lang open staan zonder voortgang
- Terugkerende thema's in titels/beschrijvingen
- Onevenwichtige verdeling (bijv. alles in triage, niets toegewezen)

## RISICO'S
Identificeer:
- Urgente/high priority issues zonder assignee
- Issues die langer dan 14 dagen in triage staan
- Componenten met veel open bugs (mogelijke structurele problemen)
- Issues zonder beschrijving (onvoldoende informatie om op te lossen)
- Potentiele duplicaten (vergelijkbare titels)

## ACTIEPUNTEN
Geef concrete aanbevelingen:
- Wie moet wat oppakken (verwijs naar issue numbers)
- Welke issues eerst (prioritering)
- Welke issues kunnen worden samengevoegd of gesloten
- Procesverbeteringen (bijv. "issues komen binnen zonder beschrijving")

Wees specifiek en verwijs altijd naar issue numbers (#N). Vermijd vage aanbevelingen.
Geef maximaal 5 patronen, 5 risico's en 8 actiepunten — focus op de belangrijkste.`;

export async function runIssueReviewer(
  projectName: string,
  issues: IssueForReview[],
): Promise<IssueReviewOutput> {
  // Build a compact summary for the AI
  const issueLines = issues
    .map((i) => {
      const age = i.days_open > 0 ? `${i.days_open}d oud` : "vandaag";
      const assignee = i.assigned_to_name ?? "niet toegewezen";
      const closed = i.closed_at ? ` (gesloten)` : "";
      return `#${i.issue_number} [${i.status}] [${i.priority}] [${i.type}] "${i.title}" — component: ${i.component ?? "onbekend"}, assignee: ${assignee}, ${age}${closed}`;
    })
    .join("\n");

  const statusCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  for (const i of issues) {
    statusCounts[i.status] = (statusCounts[i.status] ?? 0) + 1;
    priorityCounts[i.priority] = (priorityCounts[i.priority] ?? 0) + 1;
    typeCounts[i.type] = (typeCounts[i.type] ?? 0) + 1;
  }

  const statsBlock = [
    `Totaal: ${issues.length} issues`,
    `Status: ${Object.entries(statusCounts)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ")}`,
    `Prioriteit: ${Object.entries(priorityCounts)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ")}`,
    `Type: ${Object.entries(typeCounts)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ")}`,
  ].join("\n");

  const userContent = `PROJECT: ${projectName}

--- STATISTIEKEN ---
${statsBlock}

--- ALLE ISSUES ---
${issueLines}`;

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5-20250929"),
    maxRetries: 3,
    schema: IssueReviewSchema,
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
        content: userContent,
      },
    ],
  });

  return object;
}

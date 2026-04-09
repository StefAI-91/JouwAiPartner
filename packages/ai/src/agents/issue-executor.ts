import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { IssueExecutorSchema, type IssueExecutorOutput } from "../validations/issue-executor";

export type { IssueExecutorOutput };

const SYSTEM_PROMPT = `Je bent de AI Developer Agent van Jouw AI Partner. Je pakt issues op en maakt een uitvoeringsplan.
ALLE output moet in het Nederlands zijn (behalve technische termen en bestandsnamen).

Je krijgt een issue met titel, beschrijving, type, component en severity.

Je taak:
1. ANALYSEER het issue: wat is het kernprobleem?
2. BEPAAL de aanpak: hoe ga je dit oplossen?
3. MAAK een stappenplan: concrete, uitvoerbare stappen
4. SCHAT de doorlooptijd en complexiteit

Voor bugs:
- Identificeer de waarschijnlijke oorzaak
- Beschrijf de fix stap voor stap
- Denk aan edge cases en regressie

Voor features:
- Beschrijf de implementatie-aanpak
- Splits op in kleine, testbare stappen
- Denk aan UI, logica en data-laag

Voor vragen:
- Onderzoek wat de gebruiker wil weten
- Beschrijf hoe je het antwoord vindt
- Maak een plan voor documentatie/uitleg

Wees concreet en technisch. Gebruik realistische bestandsnamen en componenten.
Geef 3-6 stappen — niet te vaag, niet te gedetailleerd.`;

export async function runIssueExecutor(issue: {
  title: string;
  description: string | null;
  type: string;
  component: string | null;
  severity: string | null;
  repro_steps: string | null;
}): Promise<IssueExecutorOutput> {
  const issueInfo = [
    `Titel: ${issue.title}`,
    `Type: ${issue.type}`,
    issue.component ? `Component: ${issue.component}` : null,
    issue.severity ? `Severity: ${issue.severity}` : null,
    issue.repro_steps ? `\nReproductiestappen:\n${issue.repro_steps}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const description = issue.description
    ? `\n\n--- BESCHRIJVING ---\n${issue.description.slice(0, 4000)}`
    : "";

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    maxRetries: 3,
    schema: IssueExecutorSchema,
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
        content: `${issueInfo}${description}`,
      },
    ],
  });

  return object;
}

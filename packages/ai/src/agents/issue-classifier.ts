import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  IssueClassifierSchema,
  type IssueClassifierOutput,
} from "../validations/issue-classification";

export type { IssueClassifierOutput };

const SYSTEM_PROMPT = `Je bent de Issue Classifier: je classificeert binnenkomende feedback en bugs.
ALLE output moet in het Nederlands zijn (behalve enum-waarden).

Je krijgt: titel, beschrijving, pagina-URL en het originele feedbacktype uit Userback.
De pageUrl geeft context over WAAR in de applicatie het probleem zit.

Je bepaalt:

1. TYPE: wat voor soort issue is dit?
   - bug: iets werkt niet, is kapot, crasht, toont verkeerde data, layout is broken
   - feature_request: gebruiker wil iets nieuws, een verbetering, of een aanpassing
   - question: gebruiker snapt iets niet, is verward, stelt een vraag

   LET OP: Userback "General" items kunnen bug, feature_request OF question zijn — bepaal op basis van de beschrijving.
   Userback "Bug" -> meestal bug, maar check of het niet eigenlijk een feature_request is.
   Userback "Idea" -> meestal feature_request.

2. COMPONENT: welk technisch onderdeel is betrokken?
   - frontend: UI problemen, layout, styling, knoppen, formulieren, visuele bugs
   - backend: server logica, business rules, data verwerking
   - api: API endpoints, integraties met externe diensten, timeouts
   - database: data opslag, queries, ontbrekende data, sync problemen
   - prompt_ai: AI/LLM gerelateerd, prompt kwaliteit, AI responses, chat functionaliteit
   - unknown: niet te bepalen uit de beschrijving

   HINT: gebruik de pageUrl als aanwijzing:
   - /dashboard/studios -> frontend of prompt_ai
   - /dashboard/co-founder -> prompt_ai
   - /admin -> backend of frontend
   - /api -> api

3. SEVERITY: hoe ernstig is dit?
   - critical: applicatie onbruikbaar, data verlies, security issue
   - high: belangrijke functie werkt niet, geen workaround
   - medium: bug maar er is een workaround, of matig belangrijke feature request
   - low: cosmetisch, typo, nice-to-have verbetering

4. REPRO_STEPS: genereer concrete reproductiestappen in het Nederlands.
   - Baseer op de beschrijving en pageUrl
   - Als er te weinig informatie is: beschrijf wat je WEL weet en geef aan welke info ontbreekt
   - Formaat: genummerde stappen (1. Ga naar... 2. Klik op... 3. Verwacht: ... Actueel: ...)

5. CONFIDENCE: hoe zeker ben je? (0.0-1.0)
   - 0.9+: duidelijke beschrijving, type en component zijn evident
   - 0.6-0.8: redelijk duidelijk maar enige ambiguiteit
   - <0.6: vage beschrijving, moeilijk te classificeren (bijv. "Test" of "dit moet beter")

BELANGRIJK: Classificeer ALTIJD, ook bij vage beschrijvingen. Geef dan een lage confidence.`;

export async function runIssueClassifier(issue: {
  title: string | null;
  description: string;
  page_url: string | null;
  original_type: string | null;
}): Promise<IssueClassifierOutput> {
  const issueInfo = [
    issue.title ? `Titel: ${issue.title}` : null,
    issue.original_type ? `Origineel type (Userback): ${issue.original_type}` : null,
    issue.page_url ? `Pagina URL: ${issue.page_url}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    maxRetries: 3,
    schema: IssueClassifierSchema,
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
        content: `${issueInfo}\n\n--- BESCHRIJVING ---\n${issue.description.slice(0, 4000)}`,
      },
    ],
  });

  return object;
}

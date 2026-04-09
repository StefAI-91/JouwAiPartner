# Micro Sprint DH-006: AI classificatie agent

## Doel

De Issue Classifier AI agent bouwen in het shared `@repo/ai` package en de classifyIssue Server Action in DevHub. De agent classificeert binnenkomende issues op type, component, severity en genereert reproductiestappen. Gebruikt Haiku 4.5 via Vercel AI SDK `generateObject` — hetzelfde bewezen patroon als de Gatekeeper en Email Classifier. Na deze sprint kan een issue handmatig geclassificeerd worden via een "Herclassificeer" knop op de detail pagina.

## Requirements

| ID       | Beschrijving                                                                         |
| -------- | ------------------------------------------------------------------------------------ |
| FUNC-103 | Issue aanmaken: bij opslaan draait AI classificatie op achtergrond (fire-and-forget) |
| FUNC-104 | AI vult component, severity, repro_steps aan als ze leeg zijn                        |
| FUNC-123 | runIssueClassifier bepaalt type, component, severity, repro_steps, confidence        |
| FUNC-124 | Resultaat naar ai_classification JSONB + top-level kolommen + ai_classified_at       |
| FUNC-125 | Activity log entry met action='classified', metadata={model, confidence}             |
| FUNC-127 | Bij handmatig aanmaken: classificatie als achtergrondtaak (fire-and-forget)          |
| FUNC-128 | Herclassificatie: handmatig triggerable vanuit issue detail                          |
| FUNC-129 | AI classificatie draait alleen bij aanmaak, niet bij update                          |
| FUNC-143 | Server Action: classifyIssue                                                         |
| RULE-118 | Prompt caching: system prompt gecached via cacheControl ephemeral                    |
| EDGE-103 | Bij vage beschrijving: classificeer altijd, geef lage confidence                     |
| PERF-104 | Prompt caching: ~90% sneller/goedkoper na eerste call                                |

## Bronverwijzingen

- PRD: `docs/specs/prd-devhub.md` -> sectie "5.3 AI Classificatie Spec" (regels 356-543)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Bestanden" (regels 372-379)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Zod Schema" (regels 381-404)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Agent" (regels 406-506)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Integratie in sync pipeline" (regels 508-524)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Wanneer draait classificatie?" (regels 526-531)
- Referentie: `packages/ai/src/agents/gatekeeper.ts` (bestaand patroon)

## Context

### Zod Schema

Bestand: `packages/ai/src/validations/issue-classification.ts`

```typescript
import { z } from "zod";

export const ISSUE_TYPES = ["bug", "feature_request", "question"] as const;
export const COMPONENTS = [
  "frontend",
  "backend",
  "api",
  "database",
  "prompt_ai",
  "unknown",
] as const;
export const SEVERITIES = ["critical", "high", "medium", "low"] as const;

export const IssueClassifierSchema = z.object({
  type: z
    .enum(ISSUE_TYPES)
    .describe(
      "bug = iets werkt niet/is kapot, feature_request = iets nieuws gewenst/verbetering, question = vraag/onduidelijkheid/verwarring",
    ),
  component: z
    .enum(COMPONENTS)
    .describe(
      "Welk technisch onderdeel is betrokken. Gebruik pageUrl als hint (bijv. /dashboard = frontend)",
    ),
  severity: z
    .enum(SEVERITIES)
    .describe(
      "critical = app onbruikbaar/dataverlies, high = belangrijke functie broken, medium = bug met workaround, low = cosmetisch/nice-to-have",
    ),
  repro_steps: z
    .string()
    .describe(
      "Concrete reproductiestappen in het Nederlands. Als info ontbreekt, geef aan wat er mist",
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Hoe zeker ben je van deze classificatie (0.0-1.0)"),
});

export type IssueClassifierOutput = z.infer<typeof IssueClassifierSchema>;
```

### Agent

Bestand: `packages/ai/src/agents/issue-classifier.ts`

```typescript
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { IssueClassifierSchema, IssueClassifierOutput } from "../validations/issue-classification";

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
  original_type: string | null; // Userback feedbackType: Bug, Idea, General
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
```

### Opslag van resultaat

Na classificatie wordt het resultaat opgeslagen. Het gedrag verschilt per bron:

**Altijd (ongeacht bron):**

1. `ai_classification` JSONB: volledig resultaat + model + timestamp
2. `component` kolom: AI suggestie
3. `severity` kolom: AI suggestie
4. `ai_classified_at`: timestamp
5. Activity log: action='classified', metadata={ model: 'claude-haiku-4-5', confidence: 0.85 }

**Alleen bij handmatig aangemaakt issue (source='manual'):** 6. `type` kolom: AI suggestie (als het veld leeg is)

**Bij Userback import (source='userback'):**

- `type` wordt NIET overschreven (komt al correct uit Userback field mapping: Bug→bug, Idea→feature_request, General→question)
- `priority` wordt NIET overschreven (komt al uit Userback priority mapping)

### Fire-and-forget bij handmatig aanmaken

Bij `createIssue` wordt de classificatie als achtergrondtaak gestart:

- De Server Action slaat het issue op en retourneert direct
- Classificatie draait asynchroon (niet awaited)
- Bij falen: geen error naar de gebruiker, classificatie kan later handmatig getriggerd worden

### Herclassificatie

Op de issue detail pagina komt een "Herclassificeer" knop die `classifyIssue(issueId)` aanroept. Dit overschrijft de bestaande AI classificatie.

## Prerequisites

- [ ] Micro Sprint DH-001: Database (ai_classification kolom op issues)
- [ ] Micro Sprint DH-002: Queries en mutations (updateIssue, insertActivity)
- [ ] Micro Sprint DH-005: Issue detail pagina (voor de "Herclassificeer" knop)

## Taken

- [ ] Maak `packages/ai/src/validations/issue-classification.ts` met Zod schema
- [ ] Maak `packages/ai/src/agents/issue-classifier.ts` met runIssueClassifier functie
- [ ] Maak `apps/devhub/src/actions/classify.ts` met classifyIssue Server Action
- [ ] Integreer fire-and-forget classificatie in `createIssue` Server Action (niet-awaited call)
- [ ] Voeg "Herclassificeer" knop toe aan issue detail pagina
- [ ] Exporteer de agent en schema correct vanuit `packages/ai`

## Acceptatiecriteria

- [ ] [FUNC-123] runIssueClassifier retourneert een typed object met type, component, severity, repro_steps, confidence
- [ ] [FUNC-124] Na classificatie zijn ai_classification, component, severity en ai_classified_at ingevuld op het issue
- [ ] [FUNC-125] Na classificatie is een activity log entry aangemaakt met action='classified'
- [ ] [FUNC-127] Bij handmatig issue aanmaken wordt classificatie async gestart (pagina wacht er niet op)
- [ ] [FUNC-128] "Herclassificeer" knop op issue detail triggert een nieuwe classificatie
- [ ] [FUNC-129] Classificatie draait niet automatisch bij issue update
- [ ] [RULE-118] System prompt gebruikt cacheControl ephemeral
- [ ] [EDGE-103] Agent classificeert ook bij vage beschrijvingen (geeft lage confidence)
- [ ] TypeScript compileert zonder fouten

## Geraakt door deze sprint

- `packages/ai/src/validations/issue-classification.ts` (nieuw)
- `packages/ai/src/agents/issue-classifier.ts` (nieuw)
- `apps/devhub/src/actions/classify.ts` (nieuw)
- `apps/devhub/src/actions/issues.ts` (bijgewerkt — fire-and-forget classificatie)
- `apps/devhub/src/components/issues/issue-detail.tsx` (bijgewerkt — herclassificeer knop)

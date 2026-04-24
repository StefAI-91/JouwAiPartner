# Sprint 040: Project Insights Extractor — Risico's, Insights, Needs per project

> **Scope.** Nieuwe AI-agent (`project-insights-extractor`, Haiku 4.5) die per project een gestructureerde set inzichten genereert: risico's, insights en needs (uitbreidbaar met opportunities, open vragen, stakeholders). Opslag in `summaries`-tabel als nieuw `summary_type='insights'`. Nieuwe UI-container `ProjectInsightsCard` op `/projects/[id]` tussen Summary en Verloop.
>
> **Aanleiding.** Briefing-tekst in de summary-card vat het project samen in proza, maar atomaire signalen (zoals "scope-uitbreiding drukt op deadline" of "klant prefereert Slack") gaan verloren in de tekst. Een PM wil deze signalen **gestructureerd, met bron en categorisatie** kunnen scannen. Bouwt voort op sprint 039 dat de container-architectuur op de project-page heeft opgezet.

## Doel

Aan het eind van deze sprint:

1. Draait een nieuwe agent **`project-insights-extractor`** die per project gestructureerde inzichten genereert in 3 hoofd-categorieën (risico's / insights / needs) en 3 optionele uitbreidingen (opportunities / open vragen / stakeholders).
2. Wordt een nieuwe `ProjectInsightsCard` getoond tussen `ProjectSummaryCard` en `ProjectTimeline` op `/projects/[id]`.
3. Elk insight-item heeft een **klikbare bron-pill** terug naar de meeting/email waar het uit kwam (audit trail).
4. Insights worden opnieuw gegenereerd na elke verified meeting/email die aan het project hangt — zelfde trigger-pattern als de bestaande summary-pipeline.

## Requirements

| ID       | Beschrijving                                                                                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI-040   | Nieuwe agent `project-insights-extractor.ts` (Haiku 4.5) ontvangt project-context + meeting/email-samenvattingen + segments, genereert gestructureerde inzichten     |
| AI-041   | Nieuw `ProjectInsightsOutputSchema` (Zod) met 6 categorieën: `risks`, `insights`, `needs` (verplicht), `opportunities`, `open_questions`, `stakeholders` (optioneel) |
| AI-042   | Per insight-item: `title`, `description`, `severity` (`info` / `warning` / `critical`, alleen voor risks), `sources[]` (array van `{type, id, date}` referenties)    |
| AI-043   | Prompt instrueert: één feit per item, max 1 zin description, source-id MOET overeenkomen met aangeleverde meetings/emails (geen verzonnen IDs)                       |
| AI-044   | Anti-redundantie regel: insights mogen niet doubleren met de briefing-tekst; insights = atomaire signalen, briefing = narratief                                      |
| FUNC-100 | Nieuwe pipeline-functie `generateProjectInsights(projectId, meetingIds?)` analoog aan `generateProjectSummaries`                                                     |
| FUNC-101 | `triggerSummariesForMeeting` en `triggerSummariesForEmail` roepen óók `generateProjectInsights` aan voor elk gelinkt project                                         |
| FUNC-102 | Insights opgeslagen in `summaries` met `entity_type='project'`, `summary_type='insights'`, `structured_content = ProjectInsightsOutput`                              |
| FUNC-103 | Query `getLatestProjectInsights(projectId, client?)` retourneert het laatste insights-record (null als niet gegenereerd)                                             |
| FUNC-104 | Helper `extractProjectInsights(structuredContent)` parse't en valideert (analoog aan `extractProjectTimeline`)                                                       |
| UI-110   | `ProjectInsightsCard` component op `/projects/[id]` tussen `ProjectSummaryCard` en `ProjectTimeline`                                                                 |
| UI-111   | Card-header toont totaal aantal signalen + bijgewerkt-timestamp + handmatige "Bijwerken"-knop                                                                        |
| UI-112   | 3-koloms grid voor risico's / insights / needs met categorie-eigen kleurcodering (rosé / indigo / smaragd)                                                           |
| UI-113   | Per item: titel, 1-zin description, klikbare source-pill(s) met emoji + datum + meeting-type → navigeert naar `/meetings/[id]` of `/emails/[id]`                     |
| UI-114   | Footer-strip met dropdown-buttons voor opportunities/open_questions/stakeholders (collapsed default; klik = inline expand)                                           |
| UI-115   | Severity-bolletje voor risico's: `critical`=rood gevuld, `warning`=amber gevuld, `info`=zacht amber                                                                  |
| UI-116   | Lege staat als project nog geen insights heeft: "Insights worden gegenereerd na de eerste verified meeting" + Bijwerken-knop                                         |
| RULE-040 | Insights overschrijven elkaar **niet** — elke run maakt een nieuwe `summary_versions`-rij, oudere versies blijven beschikbaar                                        |
| RULE-041 | Geen automatische "dismiss" — als de AI een insight in de volgende run weglaat, verdwijnt hij uit de UI. Geen handmatige dismiss-knoppen in deze sprint              |
| EDGE-040 | Project zonder verified meetings/emails → agent draait niet, summary-record wordt niet aangemaakt, UI toont lege staat                                               |
| EDGE-041 | Source-ID die niet meer bestaat (bv. meeting verwijderd) → render fallback-pill zonder klik-actie                                                                    |
| EDGE-042 | Schema-validatie faalt op opgeslagen `structured_content` (corrupte data) → `extractProjectInsights` returnt `null`, UI toont lege staat met regenereer-prompt       |

## Bronverwijzingen

- **Mockup (ground truth visueel):** `docs/specs/sketches/sketch-feature-projectverloop-contained-v2.html` — focus op middelste container ("Inzichten & signalen")
- **Blueprint AI-agent:** `packages/ai/src/agents/project-summarizer.ts` — zelfde pattern (system-prompt uit `prompts/`, `withAgentRun`, `generateObject` met Zod-schema)
- **Blueprint pipeline:** `packages/ai/src/pipeline/summary-pipeline.ts` — `generateProjectSummaries` (regels 16-165), `triggerSummariesForMeeting` (343-415)
- **Blueprint storage:** `packages/database/src/mutations/summaries.ts` → `createSummaryVersion` ondersteunt al `structured_content` (sprint 016)
- **Blueprint UI-grid:** `apps/cockpit/src/features/projects/components/project-summary-card.tsx` (uit sprint 039) — zelfde 3-koloms grid pattern
- **Source-tracking precedent:** geen nog. Insights is de eerste agent die expliciet bron-IDs in de output meeneemt.
- **Vision:** `docs/specs/vision-ai-native-architecture.md` §4 (Analyst-agent rol) — insights past in "Analyst" pijler

## Context

### Huidige staat

- `summaries` ondersteunt `summary_type` als string — nieuwe waarde `'insights'` introduceren is geen schema-wijziging.
- `structured_content` op `summary_versions` is `jsonb` — kan elk shape opslaan.
- `triggerSummariesForMeeting` triggert nu alleen `generateProjectSummaries` en `generateOrgSummaries`. Wordt uitgebreid.
- Geen UI-component bestaat voor inzichten op project-niveau. Wel: `management-insights` (sprint 037, in backlog) doet iets vergelijkbaars op `/intelligence/management` voor board-meetings — patroon kan deels hergebruikt worden.

### Ontwerpkeuzes (door Stef bevestigd)

1. **Haiku 4.5, niet Sonnet.** Reden: input is gestructureerd (al-samengevatte meetings + segments), output is structurele extractie binnen een Zod-schema. Geen diepe reasoning nodig — Haiku doet dit prima en is goedkoper.
2. **Source-tracking is verplicht in de output.** Elk insight-item moet `sources: [{type: 'meeting' | 'email', id: string, date: string}]` bevatten. Reden: zonder bron is een insight niet auditeerbaar (verification-first principe uit CLAUDE.md).
3. **Risks krijgen severity, andere categorieën niet.** Reden: alleen voor risico's is "hoe ernstig" een nuttig signaal. Insights/Needs zijn binair (relevant of niet).
4. **3 hoofd + 3 optionele categorieën.** Hoofd: risks/insights/needs altijd zichtbaar in 3-koloms grid. Optioneel: opportunities/open_questions/stakeholders in collapsible footer-strip — voorkomt dat de card boven de fold uitgroeit voor projecten met veel signalen.
5. **Geen dismiss-functionaliteit deze sprint.** Reden: voegt complexiteit toe (state-tracking per user) en het is nog niet duidelijk of insights bij elke regeneratie consistent terugkomen. Eerst kijken hoe de agent zich gedraagt; dismiss kan in een latere sprint.
6. **Insights-card komt tussen summary en verloop, niet erboven of in tabs.** Reden: visueel dichtst bij de briefing (zelfde verticale flow van "wat speelt er" → "hoe kwamen we hier"), conform mockup v2.

### Schema-shape

```ts
// Voorbeeld output (verkort):
{
  risks: [
    {
      title: "Scope-uitbreiding drukt op deadline",
      description: "Client-portaal voegt ~3 weken werk toe; demo eind april mogelijk niet haalbaar.",
      severity: "warning",
      sources: [
        { type: "meeting", id: "uuid-1", date: "2026-03-10" },
        { type: "meeting", id: "uuid-2", date: "2026-04-23" }
      ]
    }
  ],
  insights: [
    {
      title: "Klant prefereert Slack boven e-mail",
      description: "Joep reageert sneller op Slack; e-mail-feature-requests verdwijnen vaak.",
      sources: [{ type: "meeting", id: "uuid-3", date: "2026-04-23" }]
    }
  ],
  needs: [
    {
      title: "Onboarding-materiaal voor eindgebruikers",
      description: "Zonder docs kan Cai het platform niet uitrollen aan hun klanten.",
      sources: [{ type: "meeting", id: "uuid-4", date: "2026-04-03" }]
    }
  ],
  opportunities: [],
  open_questions: [],
  stakeholders: []
}
```

### Anti-redundantie strategie

De prompt moet expliciet voorkomen dat insights letterlijke kopieën worden van wat al in de briefing staat. Twee mechanismen:

1. **Schema-niveau:** items moeten `title` (label) + `description` (1 zin context) hebben — gestructureerd anders dan briefing-proza.
2. **Prompt-niveau:** "De briefing vat het project narratief samen. Jouw taak is om **discrete, herhaalbare signalen** te extraheren die in de briefing impliciet of expliciet aanwezig zijn maar te kort genoemd om actionable te zijn. Als een signaal al volledig in de briefing staat (1-op-1), neem het niet op."

### Right-sizing

- **Model:** Haiku 4.5 (zelfde als project-summarizer)
- **Input:** zelfde bundel als project-summarizer (meetings + segments + emails) plus de bestaande context-summary als referentie
- **Output:** kleiner dan summarizer (geen lange tekst, alleen gestructureerde lijst)
- **Frequentie:** zelfde trigger-pattern (na elke verified meeting/email aan project gelinkt). Geen aparte cron.

### File-organisatie

```
packages/ai/
├── prompts/
│   └── project-insights-extractor.md       ← NIEUW
├── src/
│   ├── agents/
│   │   └── project-insights-extractor.ts   ← NIEUW
│   ├── validations/
│   │   └── project-insights.ts             ← NIEUW (apart bestand, niet samen met project-summary)
│   └── pipeline/
│       └── summary-pipeline.ts             ← UPDATE (extra trigger-aanroep)

packages/database/src/queries/
└── summaries.ts                            ← UPDATE (nieuwe getLatestProjectInsights helper)

apps/cockpit/src/features/projects/
├── components/
│   ├── project-insights-card.tsx           ← NIEUW
│   ├── insight-item.tsx                    ← NIEUW (1 item render, herbruikbaar)
│   └── insight-source-pill.tsx             ← NIEUW (klikbaar pillje met bron)
├── utils/
│   └── format-source-pill.ts               ← NIEUW (emoji + datum + label voor source-pill)
└── README.md                               ← UPDATE
```

## Prerequisites

- **Sprint 039 moet af zijn.** `ProjectSummaryCard`-component bestaat en de page-layout heeft de structuur waar `ProjectInsightsCard` tussen kan.
- Bestaande infrastructuur: `summaries`-tabel met `structured_content` jsonb, `createSummaryVersion`, `triggerSummariesForMeeting`/`triggerSummariesForEmail`.

## Taken

### Validatie-laag (`packages/ai/src/validations/`)

- [ ] [AI-041][AI-042] `project-insights.ts` — definieer `InsightItemSchema`, `RiskItemSchema` (extends Item met severity), `SourceRefSchema`, `ProjectInsightsOutputSchema` (6 categorieën). Export `ProjectInsightsOutput` type.
- [ ] [FUNC-104] `extractProjectInsights(structuredContent)` helper analoog aan `extractProjectTimeline`. Returnt `ProjectInsightsOutput | null`.

### Agent-laag (`packages/ai/src/agents/`)

- [ ] [AI-040][AI-043][AI-044] `project-insights-extractor.ts` — model: `claude-haiku-4-5-20251001`. Functie `runProjectInsightsExtractor(projectName, meetings, segments?, emails?, existingContext?)` retourneert `ProjectInsightsOutput`. Gebruikt `withAgentRun` voor logging. System-prompt uit `prompts/project-insights-extractor.md`.
- [ ] Prompt: `packages/ai/prompts/project-insights-extractor.md`. Volgt zelfde stijl als `project-summarizer.md`. Bevat anti-redundantie-regel + verplicht source-ID-veld + categorie-uitleg.

### Pipeline-laag (`packages/ai/src/pipeline/`)

- [ ] [FUNC-100] Nieuwe functie `generateProjectInsights(projectId, meetingIds?)` in `summary-pipeline.ts`. Hergebruikt zoveel mogelijk de data-ophaal-logica van `generateProjectSummaries` (overweeg refactor naar gedeelde `getProjectInputs(projectId)` helper).
- [ ] [FUNC-101] `triggerSummariesForMeeting` en `triggerSummariesForEmail` uitbreiden: na de bestaande summary-aanroepen óók `generateProjectInsights(projectId)` aanroepen voor elk gelinkt project. `Promise.allSettled` zodat insights-falen geen summary-falen veroorzaakt.
- [ ] [FUNC-102] Opslag via `createSummaryVersion('project', projectId, 'insights', '', sourceMeetingIds, db, output)` — `content` blijft leeg, `structured_content` bevat de `ProjectInsightsOutput`.

### Database-laag (`packages/database/src/queries/`)

- [ ] [FUNC-103] `summaries.ts` — nieuwe export `getLatestProjectInsights(projectId, client?)` analoog aan `getLatestSummary` maar met `summary_type='insights'`. Retourneert `{ structured_content, version, created_at } | null`.

### UI-laag (`apps/cockpit/src/features/projects/`)

- [ ] [UI-115] `components/insight-source-pill.tsx` — accepteert `SourceRef`, rendert klikbaar pillje. Geen klik-actie als source niet bestaat (EDGE-041).
- [ ] [UI-113] `utils/format-source-pill.ts` — pure helper: source-type → emoji + label.
- [ ] [UI-115] `components/insight-item.tsx` — accepteert insight-item + categorie. Rendert severity-bolletje (alleen risks), titel, description, source-pills.
- [ ] [UI-110][UI-112][UI-114][UI-116] `components/project-insights-card.tsx` — main component. Header met counts + bijwerken-knop. 3-koloms grid voor risks/insights/needs. Footer-strip met collapsible opportunities/open_questions/stakeholders. Lege staat.
- [ ] `app/(dashboard)/projects/[id]/page.tsx` — fetch `getLatestProjectInsights` parallel met de bestaande project-data. Render `ProjectInsightsCard` tussen `ProjectSummaryCard` en `ProjectTimeline`.

### Documentatie

- [ ] Update `apps/cockpit/src/features/projects/README.md` — nieuwe componenten + utils.
- [ ] Update `packages/ai/src/agents/registry.ts` — nieuwe agent registreren voor de `/agents` observability page.

## Tests

Zelfde discipline als project-summary-tests (`packages/ai/__tests__/validations/project-summary.test.ts`).

- [ ] `packages/ai/__tests__/validations/project-insights.test.ts`:
  - Geldige output met alle categorieën gevuld → parse OK
  - Geldige output met alleen verplichte categorieën (risks/insights/needs) → parse OK
  - Onbekende severity → reject
  - Source-ref zonder `id` → reject
  - `extractProjectInsights(null)` → null
  - `extractProjectInsights({insights: ...})` met corrupte severity → null (all-or-nothing)

- [ ] `apps/cockpit/src/features/projects/utils/__tests__/format-source-pill.test.ts` — type='meeting' + meeting_type='strategy' → "🎯 Strategie", type='email' → "✉️ E-mail".

## Verification

- [ ] `npm run type-check` groen
- [ ] `npm run lint` groen
- [ ] Bestaande tests (incl. project-summary) blijven groen
- [ ] Nieuwe tests groen
- [ ] Manual: kies een project met 3+ verified meetings, klik "Bijwerken" op de insights-card → verwacht 3+ items in tenminste één categorie binnen ~10 seconden, met klikbare source-pills die navigeren naar de juiste meeting.

## Niet in scope (latere sprints)

- Dismiss-functionaliteit per insight-item (per-user state)
- Cross-project insights (overlap tussen projecten van dezelfde org)
- Notificaties bij nieuwe critical risks
- Email-digest met top insights per week
- AI-versie-tracking + diff tussen runs ("welke insights veranderden t.o.v. vorige run?")
- Heatmap-visualisatie van risk-trends over tijd
- Schema-uitbreiding `is_pivot` op `TimelineEntry` (zou mogelijk uit insights afgeleid kunnen worden in plaats van heuristiek uit sprint 039)

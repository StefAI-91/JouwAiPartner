# Sprint 016: AI Summary Pipeline (v3)

## Doel

Een AI-pipeline bouwen die twee typen samenvattingen genereert en bijwerkt: een **Project Context** (neutraal, informatief, voor wie het project niet kent) en een **AI Briefing** (forward-looking, risico's, aanbevelingen, voor het actieve team). Dezelfde pipeline werkt voor zowel projecten als organisaties. Trigger: een meeting wordt verified.

## Requirements

| ID       | Beschrijving                                                             |
| -------- | ------------------------------------------------------------------------ |
| AI-010   | Summary agent (Haiku 4.5) die twee typen summaries genereert             |
| AI-011   | Project Context prompt: neutraal, beschrijvend, voor onboarding          |
| AI-012   | AI Briefing prompt: forward-looking, risico's, aanbevelingen             |
| AI-013   | Organization Context prompt: wie is de klant, relatie, lopende projecten |
| AI-014   | Organization Briefing prompt: klant-sentiment, aandachtspunten           |
| AI-015   | Summary pipeline trigger na meeting verificatie                          |
| AI-016   | Summary versioning: nieuwe versie aanmaken, vorige bewaren               |
| AI-017   | Eerste summary genereren als er nog geen bestaat                         |
| FUNC-040 | Summary update via Server Action (handmatig re-genereren)                |

## Bronverwijzingen

- Platform spec: `docs/specs/platform-spec.md` -> sectie "6. AI Pipeline" (agent architectuur)
- Platform spec: `docs/specs/platform-spec.md` -> sectie "13.3 v3 Scope" (evolving summaries)
- Bestaande agent code: `packages/ai/src/agents/gatekeeper.ts` (patroon referentie)
- Bestaande pipeline: `packages/ai/src/pipeline/gatekeeper-pipeline.ts` (trigger referentie)

## Context

### Twee summary typen, twee perspectieven

| Type         | Doel                             | Toon                          | Update frequentie                                    |
| ------------ | -------------------------------- | ----------------------------- | ---------------------------------------------------- |
| **context**  | "Wat is dit project/deze klant?" | Neutraal, informatief         | Bij fase-wijziging, scope-wijziging, minder frequent |
| **briefing** | "Wat moet ik nu weten?"          | Actiegericht, forward-looking | Na elke verified meeting                             |

### Trigger flow

```
Meeting wordt verified (review flow)
  → Check: heeft deze meeting een project_id of organization_id?
  → Ja → Haal alle verified extracties op voor dat project/org
       → Haal huidige summaries op (indien aanwezig)
       → Genereer nieuwe context summary (als significant gewijzigd)
       → Genereer nieuwe briefing summary (altijd)
       → Sla op als nieuwe versie via createSummaryVersion()
```

### Prompt structuur

**Project Context:**

```
Je bent een projectbeschrijver. Schrijf een beknopte projectbeschrijving
op basis van alle verified meetings en besluiten.

Focus op: wat is het project, wie is de klant, welke technologie/aanpak,
wat is de scope, wie werkt eraan, wanneer moet het af.

Schrijf voor iemand die het project niet kent. Max 4-5 zinnen.
Geen meningen, geen risico's, geen aanbevelingen. Puur feitelijk.
```

**AI Briefing:**

```
Je bent een project-analist. Analyseer de huidige staat van dit project.

Focus op: voortgang vs. deadline, openstaande actiepunten en hun status,
risico's en blokkades, en wat het team deze week zou moeten doen.

Wees direct en actiegericht. Noem concrete namen, datums en items.
Als er risico's zijn, geef een concrete aanbeveling.
```

### Relevante business rules

- **RULE-001**: "Err on keeping" — oude summary versies worden nooit verwijderd
- Summaries worden alleen gegenereerd op basis van **verified** content
- Summary generatie faalt? → Log error, geen retry, vorige versie blijft staan
- Haiku 4.5 als model (consistent met Gatekeeper, cost-effective voor summaries)

### Right-sizing the model

Haiku 4.5 is voldoende voor summaries:

- Input is gestructureerd (extracties, niet raw transcript)
- Output is kort (4-5 zinnen)
- Geen complex reasoning nodig, alleen samenvatten en signaleren
- Kosten: ~$0.001 per summary call

## Prerequisites

- [ ] Sprint 015: Database extensions (summaries tabel + project velden)

## Taken

- [ ] Agent: `packages/ai/src/agents/summarizer.ts` uitbreiden met twee prompt-typen (context + briefing)
- [ ] Pipeline: `packages/ai/src/pipeline/summary-pipeline.ts` aanmaken
  - [ ] Input: entity_type, entity_id, alle verified extracties, bestaande summary
  - [ ] Output: twee nieuwe summary versies (context + briefing)
  - [ ] Haiku 4.5 als model
- [ ] Zod validatie: summary output schema in `packages/ai/src/validations/`
- [ ] Trigger: summary pipeline aanroepen na meeting verificatie in review flow
  - [ ] Hook in `packages/database/src/mutations/review.ts` of via Server Action
  - [ ] Trigger voor zowel project als organization van de meeting
- [ ] Server Action: `regenerateSummaryAction` in `apps/cockpit/src/actions/` voor handmatig re-genereren
- [ ] Error handling: log failures, geen crash, vorige summary blijft

## Acceptatiecriteria

- [ ] [AI-010] Summary agent genereert twee typen summaries via Haiku 4.5
- [ ] [AI-011] Project Context is neutraal, max 5 zinnen, geen meningen
- [ ] [AI-012] AI Briefing is forward-looking, noemt risico's en aanbevelingen
- [ ] [AI-013] Organization Context beschrijft klant, relatie, lopende projecten
- [ ] [AI-014] Organization Briefing analyseert klant-sentiment en aandachtspunten
- [ ] [AI-015] Summary wordt automatisch gegenereerd/bijgewerkt na meeting verificatie
- [ ] [AI-016] Elke update maakt een nieuwe versie, vorige versies blijven bewaard
- [ ] [AI-017] Eerste verified meeting triggert de eerste summary (geen handmatige setup nodig)
- [ ] [FUNC-040] Handmatig re-genereren via Server Action werkt

## Geraakt door deze sprint

- `packages/ai/src/agents/summarizer.ts` (gewijzigd — twee prompt-typen)
- `packages/ai/src/pipeline/summary-pipeline.ts` (nieuw — orchestratie)
- `packages/ai/src/validations/summary.ts` (nieuw — Zod schema)
- `apps/cockpit/src/actions/summaries.ts` (nieuw — regenerate action)
- `packages/database/src/mutations/review.ts` of review Server Action (gewijzigd — trigger toevoegen)

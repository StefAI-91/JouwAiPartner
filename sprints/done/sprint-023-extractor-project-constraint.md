# Sprint 023: Extractor aanpassing - Project-constraint

## Doel

De Extractor refactoren zodat project-identificatie niet meer door de Extractor zelf gedaan wordt, maar als constraint vanuit de Gatekeeper wordt ontvangen. De velden `entities.projects` en `primary_project` worden verwijderd uit het Extractor schema. De Extractor kiest per extractie uit de aangeleverde projectlijst of null. De `saveExtractions()` functie wordt gerefactored zodat project-linking nu via Gatekeeper output gaat in plaats van Extractor output. Alle Gatekeeper-projecten worden gelinkt aan de meeting via `meeting_projects` (niet alleen het primary project).

## Requirements

| ID       | Beschrijving                                                                                  |
| -------- | --------------------------------------------------------------------------------------------- |
| AI-040   | entities.projects verwijderen uit Extractor Zod schema                                        |
| AI-041   | primary_project verwijderen uit Extractor Zod schema                                          |
| AI-042   | Extractor ontvangt identified_projects als constraint in de prompt                            |
| AI-043   | Extractor mag alleen uit aangeleverde projectlijst kiezen of null toewijzen                   |
| AI-044   | Extractor mag geen nieuwe projectnamen toevoegen                                              |
| FUNC-060 | saveExtractions() refactoren: project-linking via Gatekeeper output ipv Extractor output      |
| FUNC-061 | resolveAllEntities() aanpassen: projecten komen van Gatekeeper, clients blijven van Extractor |
| FUNC-062 | linkMeetingProject() aanpassen: alle Gatekeeper-projecten linken (niet alleen primary)        |
| FUNC-063 | meeting_projects.source = 'ai' bij automatische linking vanuit pipeline                       |

## Bronverwijzingen

- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "4. Wat er verandert en wat niet" -> "Extractor ontvangt project-constraint" (regels 274-281)
- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "3.0 Gatekeeper" -> "Gatekeeper is leidend voor de projectlijst" (regels 70-72)

## Context

### Relevante business rules

- **RULE-012** (sprint 021): "Gatekeeper is leidend voor project-identificatie in de pipeline."
- **AI-043**: "De Extractor ontvangt de Gatekeeper's identified_projects als constraint. De Extractor kiest per extractie uit de aangeleverde projectlijst of null. De Extractor mag null toewijzen als hij vindt dat een extractie niet bij een van de projecten past, ook al staat het project in de lijst."
- **AI-044**: "De Extractor mag geen nieuwe projecten toevoegen."

### Extractor prompt-instructie (exacte tekst uit spec)

> "De volgende projecten zijn geidentificeerd in deze meeting: [lijst]. Gebruik ALLEEN deze projectnamen bij het toewijzen van een project aan extracties. Als een extractie niet bij een van deze projecten hoort, laat project dan null. Voeg GEEN nieuwe projectnamen toe. Je mag null toewijzen als je vindt dat een extractie niet bij een project past, ook al staat het project in de lijst."

### Huidig Extractor schema (wordt gewijzigd)

```typescript
// packages/ai/src/validations/extractor.ts

// VERWIJDEREN:
export const ExtractorOutputSchema = z.object({
  extractions: z.array(ExtractionItemSchema),
  entities: z.object({
    projects: z.array(z.string()), // <-- VERWIJDEREN
    clients: z.array(z.string()), // <-- BLIJFT
  }),
  primary_project: z.string().nullable(), // <-- VERWIJDEREN
});

// NIEUW:
export const ExtractorOutputSchema = z.object({
  extractions: z.array(ExtractionItemSchema),
  entities: z.object({
    clients: z.array(z.string()), // Clients blijven van Extractor
  }),
});
```

Het `project` veld op `ExtractionItemSchema` blijft bestaan -- de Extractor kiest per extractie uit de aangeleverde projectlijst of null.

### Huidige saveExtractions() flow (wordt gerefactored)

Huidige flow (`packages/ai/src/pipeline/save-extractions.ts`):

1. `resolveAllEntities(extractorOutput.entities)` -- resolved projecten + clients
2. `resolvePrimaryProject(extractorOutput)` -- pakt primary_project of eerste entity
3. `linkMeetingProject(meetingId, primaryProjectId)` -- linkt 1 project
4. `buildExtractionRows()` -- per extractie: project_id uit entity resolution of fallback naar primary

Nieuwe flow:

1. `resolveAllEntities({ clients: extractorOutput.entities.clients })` -- resolved alleen clients
2. Ontvang `identified_projects` van Gatekeeper (doorgegeven als parameter)
3. `linkAllMeetingProjects(meetingId, identified_projects)` -- linkt ALLE geresolvde projecten met source='ai'
4. `buildExtractionRows()` -- per extractie: project_id uit Gatekeeper's identified_projects (gematcht op extractie.project naam)

### Bestaande code

- Extractor schema: `packages/ai/src/validations/extractor.ts`
- Extractor agent: `packages/ai/src/agents/extractor.ts`
- Save extractions: `packages/ai/src/pipeline/save-extractions.ts`
- Entity resolution: `packages/ai/src/pipeline/entity-resolution.ts` (`resolveAllEntities()`)
- Meeting project linking: `packages/database/src/mutations/meetings.ts` (`linkMeetingProject()`)
- Pipeline: `packages/ai/src/pipeline/gatekeeper-pipeline.ts` (stap 9: extract)
- Extract stap: `packages/ai/src/pipeline/steps/extract.ts`

### Edge cases en foutafhandeling

- Extractie verwijst naar een project dat niet in de Gatekeeper-lijst staat: project_id = null (Extractor mag geen nieuwe projecten toevoegen).
- Gatekeeper heeft 0 projecten geidentificeerd: alle extracties krijgen project_id = null. Geen meeting_projects rijen aangemaakt.
- Bestaande meeting_projects rijen met source=null: deze krijgen bij de migratie (sprint 020) default 'ai'. Nieuwe rijen krijgen expliciet source='ai'.

## Prerequisites

- [ ] Sprint 020: Database migratie - Segmented Summaries moet afgerond zijn
- [ ] Sprint 021: Gatekeeper uitbreiding - Project-identificatie moet afgerond zijn

## Taken

- [ ] Extractor Zod schema aanpassen in `packages/ai/src/validations/extractor.ts`: verwijder `entities.projects` en `primary_project`, behoud `entities.clients`
- [ ] Extractor agent prompt aanpassen in `packages/ai/src/agents/extractor.ts`: project-constraint instructie toevoegen, identified_projects lijst injecteren
- [ ] `saveExtractions()` refactoren in `packages/ai/src/pipeline/save-extractions.ts`: project-linking via Gatekeeper output, alle projecten linken met source='ai'
- [ ] `resolveAllEntities()` aanpassen in `packages/ai/src/pipeline/entity-resolution.ts`: projecten niet meer resolven (komt van Gatekeeper), clients wel
- [ ] Pipeline aanpassen in `packages/ai/src/pipeline/gatekeeper-pipeline.ts` en `steps/extract.ts`: identified_projects doorgeven aan Extractor en saveExtractions
- [ ] Tests: unit tests voor nieuw Extractor schema, saveExtractions refactor, project-linking vanuit Gatekeeper, edge case 0 projecten

## Acceptatiecriteria

- [ ] [AI-040] `entities.projects` is verwijderd uit Extractor output schema
- [ ] [AI-041] `primary_project` is verwijderd uit Extractor output schema
- [ ] [AI-042] Extractor prompt bevat identified_projects als constraint
- [ ] [AI-043] Extractor kiest per extractie uit aangeleverde projectlijst of null
- [ ] [AI-044] Extractor voegt geen nieuwe projectnamen toe (validatie via schema)
- [ ] [FUNC-060] saveExtractions() linkt projecten via Gatekeeper output, niet Extractor output
- [ ] [FUNC-061] resolveAllEntities() resolved alleen nog clients, niet projecten
- [ ] [FUNC-062] Alle Gatekeeper-projecten worden gelinkt aan meeting via meeting_projects
- [ ] [FUNC-063] Nieuwe meeting_projects rijen hebben source = 'ai'
- [ ] Bestaande pipeline blijft werken voor meetings zonder projecten (0 projecten scenario)
- [ ] Extractor output bevat nog steeds `entities.clients` voor organisatie-koppeling

## Geraakt door deze sprint

- `packages/ai/src/validations/extractor.ts` (gewijzigd -- schema aanpassing)
- `packages/ai/src/agents/extractor.ts` (gewijzigd -- prompt aanpassing)
- `packages/ai/src/pipeline/save-extractions.ts` (gewijzigd -- refactor project-linking)
- `packages/ai/src/pipeline/entity-resolution.ts` (gewijzigd -- projecten verwijderd)
- `packages/ai/src/pipeline/gatekeeper-pipeline.ts` (gewijzigd -- identified_projects doorgeven)
- `packages/ai/src/pipeline/steps/extract.ts` (gewijzigd -- identified_projects parameter)
- `packages/database/src/mutations/meetings.ts` (gewijzigd -- linkAllMeetingProjects functie)

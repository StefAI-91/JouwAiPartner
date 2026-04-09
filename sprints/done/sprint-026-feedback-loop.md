# Sprint 026: Feedback-loop

## Doel

Een feedback-loop bouwen die het systeem laat leren van menselijke correcties in de review gate. Bij goedgekeurde project-koppelingen wordt de project-naam als alias toegevoegd aan het project (zodat toekomstige Tagger-runs deze naam herkennen). Bij afgewezen koppelingen wordt de naam toegevoegd aan de `ignored_entities` tabel (zodat de Tagger en entity resolution deze naam in de toekomst overslaan). De Tagger en entity resolution worden uitgebreid om `ignored_entities` te checken voor matching.

## Requirements

| ID       | Beschrijving                                                                               |
| -------- | ------------------------------------------------------------------------------------------ |
| FUNC-090 | Bij goedgekeurde project-koppeling in review: project-naam als alias toevoegen aan project |
| FUNC-091 | Bij afgewezen koppeling: naam toevoegen aan ignored_entities tabel                         |
| FUNC-092 | Tagger checkt ignored_entities: skip matching voor ignored names                           |
| FUNC-093 | Entity resolution checkt ignored_entities: skip resolution voor ignored names              |
| FUNC-094 | Server Actions voor feedback-acties (goedkeuren + afwijzen)                                |
| RULE-017 | Goedgekeurde koppeling -> alias toevoeging is automatisch (geen extra user actie nodig)    |
| RULE-018 | Afgewezen koppeling -> ignored_entities is organisatie-breed (niet per gebruiker)          |

## Bronverwijzingen

- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "3.5 Foutcorrectie" -> "Feedback-loop" (regels 251-266)
- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "3.5" -> "Vangnet 2: Pipeline" (regels 224-226)

## Context

### Relevante business rules

- **RULE-017**: "Bij goedkeuring van een project-koppeling in de review gate wordt de `project_name_raw` automatisch als alias toegevoegd aan het project. Dit verbetert toekomstige matching door de Tagger en Gatekeeper."
- **RULE-018**: "Bij afwijzing van een koppeling wordt de naam toegevoegd aan `ignored_entities` met scope per organisatie. Dit voorkomt dat dezelfde naam opnieuw als project getagd wordt."
- **Vangnet 2 (pipeline)**: "Entity in ignored_entities lijst -> tag verwijderd, naar 'Algemeen'."

### Feedback flow

**Goedkeuring:**

1. Reviewer klikt "Koppel aan project" (sprint 024) en selecteert een project
2. Na succesvolle koppeling: `project_name_raw` van het segment wordt als alias toegevoegd aan het geselecteerde project
3. Check: alias bestaat nog niet in project.aliases array (geen duplicaten)
4. Toekomstige meetings: Tagger matcht nu ook op deze alias (confidence 0.9)

**Afwijzing:**

1. Reviewer klikt "Verwijder tag" (sprint 024)
2. Na succesvolle verwijdering: `project_name_raw` wordt toegevoegd aan `ignored_entities`
3. `organization_id` wordt bepaald via de meeting's organization_id
4. `entity_type` = 'project'
5. Toekomstige meetings: Tagger slaat matching over voor deze naam

### ignored_entities tabel (aangemaakt in sprint 020)

```sql
ignored_entities
  id UUID PK
  organization_id UUID FK -> organizations ON DELETE CASCADE
  entity_name TEXT NOT NULL (case-insensitive)
  entity_type TEXT NOT NULL CHECK ('project', 'organization', 'person')
  created_at TIMESTAMPTZ
  UNIQUE (organization_id, entity_name, entity_type)
```

### Tagger aanpassing

De Tagger (`packages/ai/src/pipeline/tagger.ts`) moet voor elke match checken of de project-naam of het kernpunt-woord niet in `ignored_entities` staat:

```typescript
// Pseudocode
const ignoredNames = await getIgnoredEntities(organizationId, "project");
// Bij matching: skip als project_name in ignoredNames
```

### Entity resolution aanpassing

`resolveAllEntities()` (`packages/ai/src/pipeline/entity-resolution.ts`) moet voor elke entity-naam checken of deze niet in `ignored_entities` staat:

```typescript
// Pseudocode
if (ignoredNames.has(entityName.toLowerCase())) {
  resolutions.set(entityName, null); // Skip resolution
  continue;
}
```

### Bestaande code

- Segment acties (sprint 024): `apps/cockpit/src/actions/segments.ts`
- Tagger: `packages/ai/src/pipeline/tagger.ts` (sprint 022)
- Entity resolution: `packages/ai/src/pipeline/entity-resolution.ts`
- Project mutations: `packages/database/src/mutations/projects.ts` (`updateProjectAliases()`)

### Edge cases en foutafhandeling

- project_name_raw is null (Algemeen segment): geen alias toevoegen, geen ignored_entity aanmaken.
- Alias bestaat al in project.aliases: geen duplicaat toevoegen (idempotent).
- ignored_entity bestaat al (zelfde org + naam + type): UNIQUE constraint vangt dit op, upsert gebruiken.
- Meeting zonder organization_id: ignored_entity kan niet aangemaakt worden (organization_id is required). Log warning, skip ignored_entity stap.

## Prerequisites

- [ ] Sprint 020: Database migratie - Segmented Summaries moet afgerond zijn (ignored_entities tabel)
- [ ] Sprint 022: Tagger + Segment-bouw moet afgerond zijn (Tagger functie)
- [ ] Sprint 024: Review UI - Segment-weergave moet afgerond zijn (server actions)

## Taken

- [ ] Server Actions uitbreiden in `apps/cockpit/src/actions/segments.ts`: bij "koppel aan project" automatisch alias toevoegen, bij "verwijder tag" automatisch ignored_entity aanmaken
- [ ] Mutation functie in `packages/database/src/mutations/ignored-entities.ts`: insert ignored entity met upsert (ON CONFLICT DO NOTHING)
- [ ] Query functie in `packages/database/src/queries/ignored-entities.ts`: haal ignored entities op per organisatie en type
- [ ] Tagger aanpassen in `packages/ai/src/pipeline/tagger.ts`: check ignored_entities voor matching, skip ignored names
- [ ] Entity resolution aanpassen in `packages/ai/src/pipeline/entity-resolution.ts`: check ignored_entities, skip resolution voor ignored names
- [ ] Tests: unit tests voor alias-toevoeging (inclusief duplicaat-check), ignored_entities filtering, Tagger met ignored entities, entity resolution met ignored entities

## Acceptatiecriteria

- [ ] [FUNC-090] Na goedgekeurde koppeling wordt project_name_raw als alias aan het project toegevoegd
- [ ] [FUNC-091] Na afgewezen koppeling wordt project_name_raw aan ignored_entities toegevoegd
- [ ] [FUNC-092] Tagger slaat matching over voor namen in ignored_entities
- [ ] [FUNC-093] Entity resolution slaat resolution over voor namen in ignored_entities
- [ ] [FUNC-094] Server actions voor goedkeuren en afwijzen werken correct
- [ ] [RULE-017] Alias-toevoeging is automatisch (geen extra user actie)
- [ ] [RULE-018] ignored_entities is organisatie-breed
- [ ] Duplicaat-alias wordt niet toegevoegd (idempotent)
- [ ] Duplicaat ignored_entity gooit geen error (upsert)

## Geraakt door deze sprint

- `apps/cockpit/src/actions/segments.ts` (gewijzigd -- feedback-acties toevoegen)
- `packages/database/src/mutations/ignored-entities.ts` (nieuw)
- `packages/database/src/queries/ignored-entities.ts` (nieuw)
- `packages/ai/src/pipeline/tagger.ts` (gewijzigd -- ignored_entities check)
- `packages/ai/src/pipeline/entity-resolution.ts` (gewijzigd -- ignored_entities check)

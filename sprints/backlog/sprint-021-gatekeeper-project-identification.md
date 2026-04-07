# Sprint 021: Gatekeeper uitbreiding - Project-identificatie

## Doel

De Gatekeeper (Claude Haiku) uitbreiden zodat hij naast meeting-classificatie ook projecten identificeert die in de meeting besproken worden. De pipeline haalt vooraf bekende entiteiten (projecten, organisaties, personen met aliassen) op uit de database en injecteert deze als context in de Gatekeeper-prompt. De Gatekeeper retourneert een `identified_projects` array met project-naam, optioneel project_id (als gematcht aan DB), en confidence score. Dit vormt de basis voor alle downstream project-tagging en -segmentering.

## Requirements

| ID       | Beschrijving                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------- |
| AI-020   | Gatekeeper Zod schema uitbreiden met identified_projects array                                        |
| AI-021   | identified_projects bevat project_name (string), project_id (string of null), confidence (number 0-1) |
| AI-022   | Database-context ophalen voor Gatekeeper: actieve projecten met aliassen                              |
| AI-023   | Database-context ophalen voor Gatekeeper: organisaties met aliassen                                   |
| AI-024   | Database-context ophalen voor Gatekeeper: personen met organisatie-koppeling                          |
| AI-025   | Context-injection functie: formatteert DB-entiteiten als prompt-context string                        |
| AI-026   | Gatekeeper prompt aanpassen met project-identificatie instructies                                     |
| AI-027   | Anti-hallucinatie instructie in Gatekeeper prompt                                                     |
| RULE-012 | Gatekeeper is leidend voor project-identificatie in de pipeline                                       |
| RULE-013 | Bij conflict tussen Gatekeeper en entity resolution wint de Gatekeeper                                |
| RULE-014 | Filtering: alleen actieve projecten als context meegeven                                              |

## Bronverwijzingen

- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "3.0 Gatekeeper: project-identificatie" (regels 23-72)
- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "3.2 Pipeline: segmenten bouwen" (regels 144-161) — 0-projecten scenario
- Platform spec: `docs/specs/platform-spec.md` -> Gatekeeper agent beschrijving

## Context

### Relevante business rules

- **RULE-012**: "Gatekeeper is leidend voor project-identificatie. De bestaande entity resolution in de pipeline draait alleen als fallback voor projecten waar de Gatekeeper project_id: null retourneert. Bij conflict wint de Gatekeeper."
- **RULE-013**: "Bij conflict tussen Gatekeeper en entity resolution wint de Gatekeeper."
- **RULE-014**: "Filtering: alleen actieve projecten. Bij meetings met bekende deelnemers: prioriteit aan projecten van hun organisaties."

### Datamodel

Bestaande tabellen die gelezen worden voor context:

- `projects` — id, name, aliases, organization_id, status (filter op status != 'completed' en != 'lost')
- `organizations` — id, name, aliases
- `people` — id, name, email, organization_id (via JOIN op organizations)

### Schema-uitbreiding Gatekeeper

Het bestaande Gatekeeper Zod schema (`packages/ai/src/validations/gatekeeper.ts`) wordt uitgebreid:

```typescript
// Bestaand (ongewijzigd)
relevance_score: z.number(),
reason: z.string(),
meeting_type: z.enum(MEETING_TYPES),
organization_name: z.string().nullable(),

// Nieuw
identified_projects: z.array(z.object({
  project_name: z.string(),       // Naam zoals gematcht of uit transcript
  project_id: z.string().nullable(), // UUID als gematcht aan DB, null als onbekend
  confidence: z.number()           // 0.0-1.0
}))
```

### Context-injection formaat

De context-injection functie produceert een string in dit formaat:

```
Bekende projecten:
- "Jansen Klantportaal" (id: uuid, organisatie: Jansen & Co, aliassen: "het portaal", "klantplatform")
- "IntraNext Migratie" (id: uuid, organisatie: IntraNext, aliassen: "de migratie")

Bekende organisaties:
- "Jansen & Co" (aliassen: "Jansen")
- "IntraNext BV" (aliassen: "IntraNext")

Bekende personen:
- "Pieter de Vries" (organisatie: Jansen & Co)
- "Anna Bakker" (organisatie: IntraNext)
```

### Anti-hallucinatie instructie

Exacte tekst voor de prompt:

> "Match alleen aan bekende projecten als je daar zeker van bent. Als een project wordt besproken dat niet in de lijst staat, geef dan de naam uit het transcript met project_id: null. Verzin geen match -- liever null dan een foute koppeling."

### Bestaande code

- Gatekeeper agent: `packages/ai/src/agents/gatekeeper.ts`
- Gatekeeper schema: `packages/ai/src/validations/gatekeeper.ts`
- Pipeline: `packages/ai/src/pipeline/gatekeeper-pipeline.ts` (stap 3: `runGatekeeper()`)
- Query functies: `packages/database/src/queries/projects.ts` (`getAllProjects()`), `packages/database/src/queries/organizations.ts` (`getAllOrganizations()`)

### Edge cases en foutafhandeling

- **EDGE-004**: Als er geen actieve projecten in de database staan, wordt een lege projectenlijst meegegeven en retourneert de Gatekeeper een lege `identified_projects` array.
- **EDGE-005**: Als de Gatekeeper een projectnaam retourneert die exact overeenkomt met een DB-project maar een ander project_id geeft, wordt het DB-project_id gebruikt (Gatekeeper kan geen UUIDs genereren).
- Backwards compatibility: het bestaande deel van de Gatekeeper output (relevance_score, reason, meeting_type, organization_name) blijft ongewijzigd.

## Prerequisites

- [ ] Sprint 020: Database migratie - Segmented Summaries moet afgerond zijn

## Taken

- [ ] Gatekeeper Zod schema uitbreiden met `identified_projects` array in `packages/ai/src/validations/gatekeeper.ts`
- [ ] Context-injection functie bouwen in `packages/ai/src/pipeline/context-injection.ts`: haalt projecten, organisaties en personen op uit DB en formatteert als prompt-context string
- [ ] Query functies toevoegen/uitbreiden in `packages/database/src/queries/` voor actieve projecten met org-naam en personen met org-koppeling
- [ ] Gatekeeper agent prompt aanpassen in `packages/ai/src/agents/gatekeeper.ts`: project-identificatie instructies + anti-hallucinatie instructie + context-injectie
- [ ] Pipeline aanpassen in `packages/ai/src/pipeline/gatekeeper-pipeline.ts`: context ophalen voor Gatekeeper call, resultaat doorgeven aan downstream stappen
- [ ] Tests: unit tests voor Zod schema validatie, context-formatting functie, mock Gatekeeper response parsing

## Acceptatiecriteria

- [ ] [AI-020] Gatekeeper Zod schema bevat `identified_projects` array
- [ ] [AI-021] Elk item in `identified_projects` heeft project_name (string), project_id (string|null), confidence (number)
- [ ] [AI-022] Context-functie haalt actieve projecten op (niet completed/lost)
- [ ] [AI-023] Context-functie haalt organisaties op met aliassen
- [ ] [AI-024] Context-functie haalt personen op met organisatie-koppeling
- [ ] [AI-025] Context-injection produceert leesbare prompt-string met alle entiteiten
- [ ] [AI-026] Gatekeeper prompt bevat project-identificatie instructies
- [ ] [AI-027] Gatekeeper prompt bevat anti-hallucinatie instructie (letterlijk uit spec)
- [ ] [RULE-014] Alleen actieve projecten worden meegegeven als context
- [ ] [EDGE-004] Lege projectenlijst resulteert in lege identified_projects array (geen crash)
- [ ] Bestaande Gatekeeper output (relevance_score, meeting_type etc.) blijft ongewijzigd

## Geraakt door deze sprint

- `packages/ai/src/validations/gatekeeper.ts` (gewijzigd — schema uitbreiding)
- `packages/ai/src/agents/gatekeeper.ts` (gewijzigd — prompt aanpassing)
- `packages/ai/src/pipeline/context-injection.ts` (nieuw)
- `packages/ai/src/pipeline/gatekeeper-pipeline.ts` (gewijzigd — context ophalen)
- `packages/database/src/queries/projects.ts` (gewijzigd — actieve projecten query)
- `packages/database/src/queries/people.ts` (gewijzigd — personen met org query)

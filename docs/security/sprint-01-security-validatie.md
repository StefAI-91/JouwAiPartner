# Micro Sprint 01: Security & Validatie (KRITIEK)

## Doel

Alle Server Actions in `src/lib/actions/` beveiligen en standaardiseren. Er zijn drie kritieke problemen:

1. SQL injection vector in `embeddings.ts` waar een `table` parameter zonder whitelist in `.from(table)` wordt gebruikt -- een kwaadwillende caller kan elke tabel in de database benaderen.
2. Geen enkele Server Action valideert input met Zod, wat de CLAUDE.md architectuurregel schendt ("Zod validatie in Server Actions -- valideer alle input voor de database call").
3. Inconsistente return types: mix van `{ success: true; id }`, `{ success: true; linked }` en `{ success: true; data: { id } }`. CLAUDE.md schrijft voor: `{ success: true; data?: T } | { error: string }`.

Na deze sprint is elke action gevalideerd, veilig en consistent.

## Fixes

| #   | Beschrijving                                                                               |
| --- | ------------------------------------------------------------------------------------------ |
| F1  | SQL injection fix: whitelist voor table parameter in embeddings action                     |
| F2  | Zod schemas toevoegen voor alle Server Actions                                             |
| F3  | Standaardiseer action return types naar `{ success: true; data?: T } \| { error: string }` |

## Context

### Huidige bestanden en hun problemen

**`src/lib/actions/embeddings.ts`** (21 regels)

- Functie: `updateRowEmbedding(table: string, id: string, embedding: number[])`
- Probleem: `table` wordt direct doorgegeven aan `.from(table)`. Geen validatie.
- Toegestane tabellen (whitelist): `meetings`, `extractions`, `people`, `projects`, `organizations`, `decisions`
- Callers: `src/lib/services/embed-pipeline.ts` (regels 64, 81), `src/lib/services/re-embed-worker.ts`

**`src/lib/actions/meetings.ts`** (41 regels)

- Functies: `insertMeeting(meeting)`, `updateMeetingProject(meetingId, projectId)`
- Geen Zod validatie op input
- Return types zijn al correct (`{ success: true; data: { id } }` en `{ success: true }`)

**`src/lib/actions/action-items.ts`** (23 regels)

- Functie: `insertActionItem(item)`
- Return type: `{ success: true; id: string }` -- **FOUT**, moet `{ success: true; data: { id: string } }` zijn
- Geen Zod validatie

**`src/lib/actions/decisions.ts`** (24 regels)

- Functie: `insertDecision(decision)`
- Return type: `{ success: true; id: string }` -- **FOUT**, moet `{ success: true; data: { id: string } }` zijn
- Geen Zod validatie

**`src/lib/actions/meeting-participants.ts`** (26 regels)

- Functie: `linkMeetingParticipants(meetingId, personIds)`
- Return type: `{ success: true; linked: number }` -- **FOUT**, moet `{ success: true; data: { linked: number } }` zijn
- Geen Zod validatie

**`src/lib/actions/projects.ts`** (19 regels)

- Functie: `updateProjectAliases(projectId, aliases)`
- Return type: `{ success: true }` -- correct
- Geen Zod validatie

### Callers die aangepast moeten worden na return type wijziging

- `src/lib/services/gatekeeper-pipeline.ts` regel 38: `result.linked` --> `result.data?.linked` (in `matchParticipants` functie)
- `src/lib/services/save-extractions.ts`: geen aanpassing nodig (gebruikt geen velden uit return)
- Alle bestanden die `.id` direct uit action-items of decisions results lezen moeten naar `.data.id`

### Standaard return type conventie (uit CLAUDE.md)

```typescript
// Succes met data
{ success: true, data: { id: "..." } }

// Succes zonder data
{ success: true }

// Error
{ error: "beschrijving" }
```

### Zod schema richtlijnen

Elk schema valideert exact de input parameters van de bijbehorende action functie:

- UUID velden: `z.string().uuid()`
- Embedding arrays: `z.array(z.number()).length(1024)` (Cohere embed-v4, 1024 dimensies)
- Table whitelist: `z.enum(["meetings", "extractions", "people", "projects", "organizations", "decisions"])`
- Nullable velden: `z.string().nullable()`
- Score velden: `z.number().min(0).max(1)`

## Prerequisites

Geen -- dit is de eerste sprint en heeft geen afhankelijkheden.

## Taken

- [ ] **Taak 1: Maak Zod validatieschemas** -- Maak de volgende bestanden aan:
  - `src/lib/validations/embeddings-action.ts`: schema met `table` als `z.enum(["meetings", "extractions", "people", "projects", "organizations", "decisions"])`, `id` als `z.string().uuid()`, `embedding` als `z.array(z.number()).length(1024)`
  - `src/lib/validations/meetings-action.ts`: schema voor `insertMeeting` input (alle velden met types uit huidige functiesignatuur) en `updateMeetingProject` input
  - `src/lib/validations/action-items-action.ts`: schema voor `insertActionItem` input
  - `src/lib/validations/decisions-action.ts`: schema voor `insertDecision` input
  - `src/lib/validations/meeting-participants-action.ts`: schema voor `linkMeetingParticipants` input
  - `src/lib/validations/projects-action.ts`: schema voor `updateProjectAliases` input
    Let op: er bestaan al `extractor.ts`, `fireflies.ts`, `gatekeeper.ts` in validations -- gebruik het suffix `-action` om conflicten te voorkomen.

- [ ] **Taak 2: Fix SQL injection in `src/lib/actions/embeddings.ts`** -- Importeer het embeddings-action schema, parse de input als eerste stap. Als `table` niet in de whitelist staat, return `{ error: "Invalid table name" }`.

- [ ] **Taak 3: Voeg Zod validatie toe aan alle overige actions** -- In elk action-bestand: importeer het bijbehorende schema, parse de input als eerste stap, return `{ error: zodError.issues[0].message }` bij validatiefout.

- [ ] **Taak 4: Standaardiseer return types** -- Wijzig:
  - `action-items.ts` regel 22: `{ success: true, id: data.id }` --> `{ success: true, data: { id: data.id } }`
  - `decisions.ts` regel 22: `{ success: true, id: data.id }` --> `{ success: true, data: { id: data.id } }`
  - `meeting-participants.ts` regel 25: `{ success: true, linked: personIds.length }` --> `{ success: true, data: { linked: personIds.length } }` en regel 13: `{ success: true, linked: 0 }` --> `{ success: true, data: { linked: 0 } }`

- [ ] **Taak 5: Update callers** -- Pas property access aan in:
  - `src/lib/services/gatekeeper-pipeline.ts` regel 38: `result.linked` --> `result.data?.linked ?? 0`
  - Zoek in alle bestanden naar imports van gewijzigde actions en check of ze `.id` of `.linked` direct uitlezen

- [ ] **Taak 6: Verify** -- Run `npm run lint` en `npm run build` om te controleren dat alles compileert.

## Acceptatiecriteria

- [ ] [F1] `updateRowEmbedding("users", id, embedding)` retourneert `{ error: "..." }` zonder database call
- [ ] [F1] `updateRowEmbedding("meetings", id, embedding)` werkt normaal
- [ ] [F2] Elk action-bestand in `src/lib/actions/` parseert input met een Zod schema als eerste stap
- [ ] [F2] Elk Zod schema staat in een apart bestand in `src/lib/validations/`
- [ ] [F3] Alle actions retourneren `{ success: true; data?: T }` of `{ error: string }` -- geen andere vormen
- [ ] [F3] Alle callers zijn bijgewerkt naar de nieuwe return types
- [ ] `npm run build` slaagt zonder fouten
- [ ] `npm run lint` slaagt zonder fouten

## Geraakt door deze sprint

- `src/lib/validations/embeddings-action.ts` (nieuw)
- `src/lib/validations/meetings-action.ts` (nieuw)
- `src/lib/validations/action-items-action.ts` (nieuw)
- `src/lib/validations/decisions-action.ts` (nieuw)
- `src/lib/validations/meeting-participants-action.ts` (nieuw)
- `src/lib/validations/projects-action.ts` (nieuw)
- `src/lib/actions/embeddings.ts` (wijziging)
- `src/lib/actions/meetings.ts` (wijziging)
- `src/lib/actions/action-items.ts` (wijziging)
- `src/lib/actions/decisions.ts` (wijziging)
- `src/lib/actions/meeting-participants.ts` (wijziging)
- `src/lib/actions/projects.ts` (wijziging)
- `src/lib/services/gatekeeper-pipeline.ts` (wijziging -- caller update)

## Complexiteit

**Middel** -- Veel bestanden maar elk is klein en de wijzigingen zijn mechanisch. Zod schemas schrijven is rechttoe rechtaan. Grootste risico is het missen van een caller bij de return type wijziging.

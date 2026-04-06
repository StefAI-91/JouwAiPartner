# Sprint 024: Review UI - Segment-weergave

## Doel

De review detail pagina uitbreiden met een sectie die project-segmenten toont. Reviewers zien per meeting welke projecten de AI heeft geidentificeerd, met per project de kernpunten en vervolgstappen. Onbekende projecten (project_id = null maar wel een project_name_raw) worden gemarkeerd met een waarschuwingsicoon. Twee acties zijn beschikbaar: "Koppel aan project" (selecteer bestaand project uit dropdown) en "Verwijder tag" (verplaats kernpunten naar Algemeen). Segment-correcties triggeren re-embedding (embedding_stale = true).

## Requirements

| ID       | Beschrijving                                                                                       |
| -------- | -------------------------------------------------------------------------------------------------- |
| UI-050   | Segment-weergave in review detail pagina: per project kernpunten + vervolgstappen                  |
| UI-051   | Onbekende projecten markeren met waarschuwingsicoon (AlertTriangle uit Lucide)                     |
| UI-052   | Actie "Koppel aan project": dropdown met bestaande projecten                                       |
| UI-053   | Actie "Verwijder tag": verplaats kernpunten naar Algemeen segment                                  |
| FUNC-070 | Server Action: koppel segment aan bestaand project (update project_id, set embedding_stale=true)   |
| FUNC-071 | Server Action: verwijder tag van segment (verplaats items naar Algemeen, set embedding_stale=true) |
| FUNC-072 | Query functie: haal segmenten op bij meeting (met project-naam via JOIN)                           |
| DATA-090 | meeting_project_summaries: embedding_stale=true na segment-correctie                               |

## Bronverwijzingen

- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "3.5 Foutcorrectie" -> "Vangnet 3: Review gate" (regels 229-249)
- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "3.4b Re-embedding strategie" (regels 207-215)

## Context

### Relevante business rules

- **RULE-015** (sprint 022): "Graceful degradation" -- als er geen segmenten zijn voor een meeting, toont de review pagina gewoon de bestaande samenvatting zonder segmenten-sectie.
- Segment-correctie triggert re-embedding: als een reviewer een project koppelt of verwijdert, wordt `embedding_stale = true` gezet. De bestaande re-embed worker pikt dit op.

### UI/UX beschrijving

De review detail pagina (`/review/[id]`) krijgt een nieuwe sectie "Project-segmenten" onder of naast de bestaande extractie-review:

```
Segmenten:
[check] Project Alpha (4 kernpunten, 2 vervolgstappen)
  - Kernpunt 1
  - Kernpunt 2
  - ...
  Vervolgstappen:
  - Vervolgstap 1
  - ...

[warning] "dat nieuwe platform" (2 kernpunten)      -> niet gematcht
  - Kernpunt 1
  - Kernpunt 2
  -> [Koppel aan project v]  [Verwijder tag]

[check] Algemeen (1 kernpunt)
  - Kernpunt 1
```

**"Koppel aan project" dropdown:**

- Toont alle bestaande projecten uit de database
- Bij selectie: segment.project_id wordt bijgewerkt, project_name_raw blijft bewaard
- segment.embedding_stale wordt true

**"Verwijder tag" knop:**

- Verplaatst kernpunten en vervolgstappen van dit segment naar het "Algemeen" segment
- Als er nog geen "Algemeen" segment is, wordt er een aangemaakt
- Het lege segment wordt verwijderd
- Beide segmenten (oud + Algemeen) krijgen embedding_stale = true

### Datamodel

Query voor segmenten bij een meeting:

```sql
SELECT
  mps.id,
  mps.meeting_id,
  mps.project_id,
  mps.project_name_raw,
  mps.is_general,
  mps.kernpunten,
  mps.vervolgstappen,
  p.name as project_name
FROM meeting_project_summaries mps
LEFT JOIN projects p ON p.id = mps.project_id
WHERE mps.meeting_id = $1
ORDER BY mps.is_general ASC, p.name ASC
```

### Rollen en permissies

Alle authenticated users (Stef, Wouter, Ege) kunnen segment-correcties doen. Zelfde permissie-model als bestaande review acties. RLS op meeting_project_summaries (SEC-006, sprint 020) staat CRUD toe voor authenticated users.

### Edge cases en foutafhandeling

- Meeting zonder segmenten: sectie "Project-segmenten" wordt niet getoond (graceful).
- Alle segmenten zijn "Algemeen": toon alleen het Algemeen segment, geen acties nodig.
- "Verwijder tag" op laatste niet-Algemeen segment: resultaat is 1 Algemeen segment met alle items.
- Concurrent edits: server action checkt of segment nog bestaat voor update (optimistic, geen lock).

## Prerequisites

- [ ] Sprint 020: Database migratie - Segmented Summaries moet afgerond zijn
- [ ] Sprint 022: Tagger + Segment-bouw moet afgerond zijn (segmenten bestaan in DB)

## Taken

- [ ] Query functie bouwen in `packages/database/src/queries/meeting-project-summaries.ts`: haal segmenten op bij meeting met project JOIN
- [ ] Server Action "koppel aan project" in `apps/cockpit/src/actions/segments.ts`: update project_id op segment, set embedding_stale=true, revalidate
- [ ] Server Action "verwijder tag" in `apps/cockpit/src/actions/segments.ts`: verplaats items naar Algemeen segment, verwijder leeg segment, set embedding_stale=true
- [ ] Segment-weergave component in `apps/cockpit/src/components/review/segment-list.tsx`: toont segmenten met kernpunten/vervolgstappen, waarschuwingsicoon, acties
- [ ] Integreer segment-component in review detail pagina `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx`
- [ ] Tests: unit tests voor server actions (koppelen, verwijderen), query functies

## Acceptatiecriteria

- [ ] [UI-050] Review detail pagina toont segmenten per project met kernpunten en vervolgstappen
- [ ] [UI-051] Segmenten met project_id=null maar project_name_raw!=null tonen waarschuwingsicoon
- [ ] [UI-052] "Koppel aan project" dropdown toont bestaande projecten en linkt segment
- [ ] [UI-053] "Verwijder tag" verplaatst items naar Algemeen segment
- [ ] [FUNC-070] Server action voor koppelen werkt: project_id wordt bijgewerkt, embedding_stale=true
- [ ] [FUNC-071] Server action voor verwijderen werkt: items verplaatst, leeg segment verwijderd
- [ ] [FUNC-072] Query functie haalt segmenten op met project-naam via JOIN
- [ ] [DATA-090] Na elke segment-correctie is embedding_stale=true op betrokken segmenten
- [ ] Meeting zonder segmenten toont geen segmenten-sectie (geen crash)

## Geraakt door deze sprint

- `packages/database/src/queries/meeting-project-summaries.ts` (nieuw)
- `packages/database/src/mutations/meeting-project-summaries.ts` (gewijzigd -- update/delete functies)
- `apps/cockpit/src/actions/segments.ts` (nieuw)
- `apps/cockpit/src/components/review/segment-list.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx` (gewijzigd -- segment-sectie toevoegen)

# Sprint 027: Meeting detail UI - Segmenten

## Doel

De meeting detail pagina uitbreiden met een sectie "Project-segmenten" waar dezelfde correctie-acties beschikbaar zijn als in de review UI (koppelen aan project, verwijder tag). Dit werkt voor zowel draft als verified meetings, zodat ook al-geverifieerde meetings achteraf gecorrigeerd kunnen worden. De segment-componenten uit sprint 024 worden hergebruikt.

## Requirements

| ID       | Beschrijving                                                             |
| -------- | ------------------------------------------------------------------------ |
| UI-060   | Sectie "Project-segmenten" op meeting detail pagina                      |
| UI-061   | Zelfde correctie-acties als review UI: koppel aan project, verwijder tag |
| UI-062   | Werkt voor zowel draft als verified meetings                             |
| FUNC-100 | Hergebruik segment-componenten uit sprint 024 (segment-list component)   |

## Bronverwijzingen

- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "3.6 Achteraf corrigeren (verified meetings)" (regels 269-271)
- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "3.5 Foutcorrectie" -> "Vangnet 3: Review gate" (regels 229-249) -- zelfde acties

## Context

### Relevante business rules

- De meeting detail pagina (`/meetings/[id]`) toont dezelfde segment-weergave als de review detail pagina (`/review/[id]`).
- Correcties op verified meetings werken exact hetzelfde als op draft meetings: project koppelen of tag verwijderen, embedding_stale = true triggeren.
- Het verschil met de review pagina: er is geen "goedkeuren/afwijzen" flow -- alleen directe correctie.

### UI/UX beschrijving

De meeting detail pagina (`/meetings/[id]`) krijgt een nieuwe sectie "Project-segmenten" als tab of als sectie onder de bestaande content:

```
## Project-segmenten

[check] Project Alpha (4 kernpunten, 2 vervolgstappen)
  - Kernpunt 1
  - ...

[warning] "dat nieuwe platform" (2 kernpunten)
  -> [Koppel aan project v]  [Verwijder tag]

[check] Algemeen (1 kernpunt)
  - Kernpunt 1
```

Dit is exact dezelfde weergave als in de review pagina. Het `segment-list.tsx` component uit sprint 024 wordt hergebruikt.

### Hergebruik componenten

- `apps/cockpit/src/components/review/segment-list.tsx` (sprint 024) -- hergebruiken of verplaatsen naar shared
- Als het component specifieke review-logica bevat, verplaats het naar `apps/cockpit/src/components/shared/segment-list.tsx`
- Server actions uit `apps/cockpit/src/actions/segments.ts` (sprint 024) worden hergebruikt -- deze zijn niet pagina-specifiek

### Bestaande code

- Meeting detail pagina: `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`
- Segment-list component: `apps/cockpit/src/components/review/segment-list.tsx` (sprint 024)
- Segment server actions: `apps/cockpit/src/actions/segments.ts` (sprint 024)
- Segment query: `packages/database/src/queries/meeting-project-summaries.ts` (sprint 024)

### Edge cases en foutafhandeling

- Meeting zonder segmenten: sectie "Project-segmenten" wordt niet getoond.
- Meeting met alleen "Algemeen" segment: toon het segment maar zonder correctie-acties (er valt niets te koppelen/verwijderen).
- Correctie op verified meeting: werkt identiek aan draft meeting. Geen extra bevestiging nodig.

## Prerequisites

- [ ] Sprint 024: Review UI - Segment-weergave moet afgerond zijn (segment componenten + server actions)

## Taken

- [ ] Segment-list component verplaatsen naar shared locatie als nodig (bv. `apps/cockpit/src/components/shared/segment-list.tsx`) of hergebruiken vanuit review/
- [ ] Meeting detail pagina uitbreiden in `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`: segmenten ophalen en segment-list component renderen
- [ ] Zorg dat server actions in `apps/cockpit/src/actions/segments.ts` correct revalidaten voor zowel `/review/[id]` als `/meetings/[id]` routes
- [ ] Tests: unit tests voor component rendering met segmenten, server actions revalidatie

## Acceptatiecriteria

- [ ] [UI-060] Meeting detail pagina toont sectie "Project-segmenten" met kernpunten en vervolgstappen per project
- [ ] [UI-061] Correctie-acties (koppelen, verwijderen) werken op meeting detail pagina
- [ ] [UI-062] Werkt voor zowel draft als verified meetings
- [ ] [FUNC-100] Segment-componenten zijn hergebruikt uit sprint 024 (geen code-duplicatie)
- [ ] Meeting zonder segmenten toont geen segmenten-sectie

## Geraakt door deze sprint

- `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx` (gewijzigd -- segment-sectie)
- `apps/cockpit/src/components/shared/segment-list.tsx` (nieuw of verplaatst vanuit review/)
- `apps/cockpit/src/components/review/segment-list.tsx` (gewijzigd -- import aanpassen als verplaatst)
- `apps/cockpit/src/actions/segments.ts` (gewijzigd -- revalidatie voor meeting route)

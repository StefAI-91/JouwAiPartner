# Micro Sprint SRP-005: pipeline/summary/core.ts splitsen per scope

## Doel

`packages/ai/src/pipeline/summary/core.ts` is **516 regels** met 4 exports die elk een eigen scope vertegenwoordigen: project summaries, org summaries, en twee triggers (meeting + email). Pipeline-cluster-regel (CLAUDE.md) zegt >300 regels = splitsbaar. Na deze sprint: één file per scope, < 200 regels elk.

## Probleem

- 516 regels in één file
- 4 onafhankelijke exports met eigen prompt-bouw, model-keuze, DB-writes:
  - `generateProjectSummaries` (regels 16-175, ~160 r)
  - `generateOrgSummaries` (regels 176-343, ~168 r)
  - `triggerSummariesForMeeting` (regels 344-420, ~77 r)
  - `triggerSummariesForEmail` (regels 421-516, ~96 r)
- Project- en org-summary-logica heeft mogelijk shared helpers (prompt-bouw, output-shape) die nu duplicaat staan

## Voorgestelde structuur

```
packages/ai/src/pipeline/summary/
├── index.ts                       ← re-export voor backward compat
├── core.ts                        ← shared types + helpers (als die er zijn)
├── project.ts                     ← generateProjectSummaries
├── org.ts                         ← generateOrgSummaries
└── triggers.ts                    ← triggerSummariesForMeeting, triggerSummariesForEmail
```

## Migratie-stappen

1. Lees de file door en identificeer gedeelde helpers (zoek naar lokale functies die door meerdere exports gebruikt worden)
2. Verhuis shared helpers naar `core.ts` (export intern, niet uit `index.ts` als ze privé bleven)
3. Splits de vier exports naar eigen files
4. `index.ts` re-export voor backward compat
5. Update callers als specifieke import gewenst is — anders niets te doen

## Deliverables

- [ ] 4 nieuwe/aangepaste files in `pipeline/summary/`
- [ ] `index.ts` re-exports identiek
- [ ] `core.ts` < 200 regels en bevat alleen shared types/helpers (of wordt verwijderd als er niks gedeeld wordt)
- [ ] Geen file > 250 regels
- [ ] Tests in `packages/ai/__tests__/pipeline/summary/*.test.ts` groen zonder mock-pad-update
- [ ] Lint, type-check, test groen

## Acceptance criteria

- Elke pipeline-stap (`project.ts`, `org.ts`, `triggers.ts`) < 250 regels
- Externe imports `from "@repo/ai/pipeline/summary"` blijven werken
- Geen circular imports tussen sub-files

## Out of scope

- Prompt-tuning of model-wisseling
- Project- en org-summary samensmelten naar één pipeline (gedragswijziging)
- `pipeline/summary/` test-coverage (eigen sprint T01)

# Micro Sprint SRP-012: queries/issues/core.ts splitsen per sub-domein

## Doel

`packages/database/src/queries/issues/core.ts` is **418 regels** met 9 exports. Net over de cluster-drempel. Sub-domeinen: list/filter, detail, counts. Na deze sprint: 3 files binnen `queries/issues/`, elk < 200 regels.

## Probleem

- 418 regels — 1.4× drempel
- Twee herkenbare sub-domeinen plus een gedeelde basis:
  - **List + filter**: `listIssues`, `countFilteredIssues`, `parseSearchQuery`, `ISSUE_SORTS`, `IssueSort`, `ISSUE_SELECT`, `IssueRow`
  - **Detail**: `getIssueById`
  - **Counts**: `getIssueCounts`, `countCriticalUnassigned`, `StatusCountKey`, `StatusCounts`
- `ISSUE_SELECT` constant (regels 49-81) en `IssueRow` type zijn shared

## Voorgestelde structuur

```
packages/database/src/queries/issues/
├── index.ts                       ← re-exports voor backward compat
├── core.ts                        ← shared types + ISSUE_SELECT, ISSUE_SORTS, IssueRow,
│                                    parseSearchQuery, getIssueById (~150 r)
├── list.ts                        ← listIssues + countFilteredIssues (~180 r)
└── counts.ts                      ← getIssueCounts, countCriticalUnassigned, StatusCountKey,
                                     StatusCounts (~80 r)
```

## Migratie-stappen

1. Maak `index.ts` met re-exports — alle 9 publieke exports moeten beschikbaar blijven
2. Verhuis `ISSUE_SELECT`, `IssueRow`, `parseSearchQuery`, sort-types naar `core.ts`
3. `list.ts` importeert uit `./core`
4. `counts.ts` importeert eventueel `IssueRow` uit `./core`
5. `npm run check:queries` om te valideren dat geen `apps/devhub/src/actions/*` of API-routes direct `.from('issues')` doen
6. Tests in `packages/database/__tests__/queries/issues*.test.ts` — assertions onveranderd

## Deliverables

- [ ] 3-4 files in `queries/issues/`
- [ ] `index.ts` re-exports identiek
- [ ] Elke nieuwe file < 200 regels
- [ ] Tests groen zonder versoepeling
- [ ] `npm run check:queries`, lint, type-check, test groen

## Acceptance criteria

- `core.ts` < 200 regels en bevat alleen shared types/constants/helpers + getIssueById
- `list.ts` < 200 regels
- `counts.ts` < 100 regels
- Externe imports `from "@repo/database/queries/issues"` onveranderd

## Out of scope

- N+1 of join-optimalisaties in `listIssues`
- `mutations/issues/core.ts` (267 r) — al onder drempel, niet nodig
- DevHub features migratie naar specifieke import-paden

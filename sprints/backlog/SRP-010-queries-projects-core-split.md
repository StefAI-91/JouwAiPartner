# Micro Sprint SRP-010: queries/projects/core.ts splitsen per sub-domein

## Doel

`packages/database/src/queries/projects/core.ts` is **460 regels** met 12 exports. Net over de cluster-drempel (>300 r). Sub-domeinen zijn duidelijk: list/detail, lookup/aliases, AI-context, embedding-match, userback-koppeling. Na deze sprint: 4 files binnen `queries/projects/`, elk < 200 regels.

## Probleem

- 460 regels — 1.5× cluster-drempel
- 12 exports met vier herkenbare sub-domeinen:
  - **List/detail base**: `listProjects`, `getProjectById`, `listFocusProjects`, types `ProjectListItem`/`ProjectDetail`/`FocusProject`
  - **Lookup/identifiers**: `getProjectAliases`, `getProjectByNameIlike`, `getAllProjects`, `getProjectName`, `getProjectByUserbackProjectId`
  - **AI-context**: `getActiveProjectsForContext` (specifiek voor pipeline use-cases) + type
  - **Embedding-match**: `matchProjectsByEmbedding`

## Voorgestelde structuur

```
packages/database/src/queries/projects/
├── index.ts                       ← re-exports voor backward compat
├── core.ts                        ← list, get, focus, types (~180 r)
├── lookup.ts                      ← aliases, ilike, all, byUserback, getName (~120 r)
├── context.ts                     ← getActiveProjectsForContext + ActiveProjectForContext type (~50 r)
└── embedding.ts                   ← matchProjectsByEmbedding (~50 r)
```

## Migratie-stappen

1. Maak `index.ts` aan met re-exports
2. Splits naar 4 files per sub-domein
3. Shared interfaces (`ProjectListItem`, `ProjectDetail`, `FocusProject`) blijven in `core.ts` of verhuizen naar `types.ts` als ze breed gebruikt worden
4. `npm run check:queries` om te valideren dat geen `apps/*/actions/*.ts` of API-route direct `.from('projects')` doet
5. Test-mocks in `packages/database/__tests__/queries/projects*.test.ts` checken — paths kunnen aangepast moeten worden

## Deliverables

- [ ] 4 nieuwe files in `queries/projects/`
- [ ] `index.ts` re-exports identiek
- [ ] Elke nieuwe file < 200 regels
- [ ] Tests groen zonder assertion-versoepeling
- [ ] `npm run check:queries`, lint, type-check, test groen

## Acceptance criteria

- `core.ts` < 200 regels en bevat alleen list/detail/focus
- `lookup.ts`, `context.ts`, `embedding.ts` elk < 150 regels
- Externe imports onveranderd via `index.ts`
- Geen circular imports

## Out of scope

- Project-detail joins optimaliseren (query-efficiency, eigen issue)
- `mutations/projects.ts` (als die bestaat) — eigen sprint
- Project-features in `apps/cockpit/src/features/projects/` — buiten database-scope

# Micro Sprint SRP-008: issue-filters.tsx subcomponenten extraheren

## Doel

`apps/devhub/src/features/issues/components/issue-filters.tsx` is **494 regels** met twee complexe inline subcomponenten (`FilterDropdown` 118 r, `SortDropdown` 106 r) plus de hoofdcomponent `IssueFilters` (211 r). Na deze sprint: drie aparte files in `issue-filters/` map binnen de feature.

## Probleem

- 494 regels — 3× component-drempel
- `FilterDropdown` is een herbruikbare dropdown met filter-state + URL-sync — hoort op zichzelf te staan
- `SortDropdown` is structureel anders (single-select vs multi-toggle) — apart concept
- Constantenlijsten (`SORT_OPTIONS`, `STATUS_OPTIONS`, etc.) staan boven, maar zijn alleen door `IssueFilters` gebruikt → mogen blijven of naar `constants.ts`

## Voorgestelde structuur

```
apps/devhub/src/features/issues/components/issue-filters/
├── index.tsx                      ← IssueFilters main, ≤ 200 regels
├── filter-dropdown.tsx            ← FilterDropdown (multi-select met URL-sync)
├── sort-dropdown.tsx              ← SortDropdown (single-select)
└── constants.ts                   ← SORT_OPTIONS, STATUS_OPTIONS, PRIORITY_OPTIONS, etc.
```

## Migratie-stappen

1. Maak folder aan op zelfde niveau als andere components
2. Verhuis `FilterDropdown` met expliciete props-interface
3. Verhuis `SortDropdown` separately
4. Verhuis constants naar `constants.ts` (alleen als ze >50 regels samen zijn — anders inline laten)
5. Update imports binnen issue-filters; externe importpaden van `IssueFilters` blijven werken via `index.tsx` resolution
6. Verifieer `apps/devhub/src/features/issues/components/issue-list.tsx` (importeert IssueFilters) — zou onveranderd moeten zijn

## Deliverables

- [ ] `issue-filters/` folder met index + 2-3 files
- [ ] `index.tsx` ≤ 200 regels
- [ ] Geen inline `function FilterDropdown|SortDropdown` meer
- [ ] URL-sync gedrag onveranderd (handmatige test: zet filter, refresh, filter blijft staan)
- [ ] Type-check + lint groen

## Acceptance criteria

- `wc -l apps/devhub/src/features/issues/components/issue-filters/index.tsx` < 200
- `filter-dropdown.tsx` < 200 regels
- `sort-dropdown.tsx` < 150 regels
- Devhub issue-pagina rendert filters identiek; URL-state werkt na refresh

## Out of scope

- Filter-state-management omzetten naar context of URL-state library
- Multi-feature dropdown abstractie (FilterDropdown is issue-specifiek nu, generaliseren = aparte sprint)
- `issue-list.tsx` (229 r) — onder de drempel

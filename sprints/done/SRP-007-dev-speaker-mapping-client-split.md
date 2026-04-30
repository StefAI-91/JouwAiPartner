# Micro Sprint SRP-007: dev/speaker-mapping/client.tsx subcomponenten extraheren

## Doel

`apps/cockpit/src/app/(dashboard)/dev/speaker-mapping/client.tsx` is **499 regels** met 5 inline subcomponenten. Zelfde patroon als SRP-004 (action-items/run): dev-tool met inline result-views. Na deze sprint: hoofdfile ≤ 200 regels, subcomponenten in `_components/`.

## Probleem

- 499 regels — 3× drempel
- 5 inline subcomponenten:
  - `BackfillPanel` (regels 97-227, ~131 r)
  - `BackfillResultRow` (regels 228-262, ~35 r)
  - `ResultPanel` (regels 263-413, ~151 r)
  - `Stat` (regels 414-431, ~18 r)
  - `GroupedByPerson` (regels 432-499, ~67 r)
- Main `SpeakerMappingClient` (regels 20-96) doet meeting-pickerstate + submit-orchestratie

## Voorgestelde structuur

```
apps/cockpit/src/app/(dashboard)/dev/speaker-mapping/
├── client.tsx                     ← main, ≤ 200 regels
├── page.tsx                       ← (bestaat al)
└── _components/
    ├── backfill-panel.tsx         ← BackfillPanel + BackfillResultRow (samen, gerelateerd)
    ├── result-panel.tsx           ← ResultPanel
    ├── grouped-by-person.tsx      ← GroupedByPerson
    └── stat.tsx                   ← Stat (overweeg: zelfde Stat als in action-items/run? → shared?)
```

## Migratie-stappen

1. Check `Stat` overlap met SRP-004 — als beide identiek zijn, overweeg `apps/cockpit/src/components/shared/dev-stat.tsx` (alleen als deze sprint gelijktijdig met SRP-004 loopt; anders later)
2. Verhuis subcomponenten één voor één met expliciete props
3. `BackfillPanel` en `BackfillResultRow` blijven samen (BackfillResultRow wordt alleen vanuit BackfillPanel gerenderd)
4. Update imports
5. Handmatige test: open `/dev/speaker-mapping`, kies een meeting, run mapping + backfill

## Deliverables

- [ ] `_components/` folder met 4 files
- [ ] `client.tsx` ≤ 200 regels
- [ ] Geen inline component-functions in `client.tsx`
- [ ] Type-check + lint groen
- [ ] Handmatige test: mapping + backfill flow werkt identiek

## Acceptance criteria

- `wc -l apps/cockpit/src/app/(dashboard)/dev/speaker-mapping/client.tsx` < 200
- Elke nieuwe `_components/*.tsx` < 200 regels
- Geen inline `function BackfillPanel|ResultPanel|GroupedByPerson|...` in `client.tsx`

## Out of scope

- Backfill-logica refactoren
- Stat-component generaliseren naar shared (alleen als SRP-004 gelijktijdig loopt; anders apart issue)
- Integration-tests voor de dev-tool

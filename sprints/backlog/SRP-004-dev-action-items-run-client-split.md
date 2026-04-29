# Micro Sprint SRP-004: dev/action-items/run/client.tsx subcomponenten extraheren

## Doel

`apps/cockpit/src/app/(dashboard)/dev/action-items/run/client.tsx` is **597 regels** met 5 inline subcomponenten. Het is een dev-tool, maar dat is geen excuus — de file mengt orchestratie, formulier-state en 5 verschillende result-views. Na deze sprint: hoofdfile ≤ 200 regels, elk subcomponent in eigen file, één map `_components/` co-located bij de page.

## Probleem

- 597 regels — 4× drempel
- 5 inline subcomponenten: `ResultPanel` (82 r), `DiffEntryCard` (109 r), `Stat` (26 r), `TwoStagePanel` (116 r), `GatedPanel` (verschillend)
- De main `RunActionItemHarnessClient` doet zelf nog formulier-state + submit-orchestratie
- Inline definitions maken hot-reload traag en testen onmogelijk

## Voorgestelde structuur

```
apps/cockpit/src/app/(dashboard)/dev/action-items/run/
├── client.tsx                     ← main orchestrator, ≤ 200 regels
├── page.tsx                       ← (bestaat al, ongewijzigd)
└── _components/
    ├── result-panel.tsx           ← ResultPanel
    ├── diff-entry-card.tsx        ← DiffEntryCard
    ├── two-stage-panel.tsx        ← TwoStagePanel
    ├── gated-panel.tsx            ← GatedPanel
    └── stat.tsx                   ← Stat (of hergebruik bestaande shared Stat-component)
```

**Naming convention:** Next.js conventie `_components/` (underscore-prefix maakt het private, niet routeerbaar).

## Migratie-stappen

1. Check of er al een shared `Stat`-component bestaat (`grep -rn "function Stat" apps/cockpit/src/components`) — zo ja, hergebruik
2. Maak `_components/` map
3. Verhuis één subcomponent per keer naar eigen file met expliciete props-interface
4. Update imports in `client.tsx`
5. Verifieer dat de page nog werkt: open `/dev/action-items/run` in dev en draai een test-meeting door

## Deliverables

- [ ] `_components/` folder met 4-5 files
- [ ] `client.tsx` ≤ 200 regels
- [ ] Geen inline component-functions in `client.tsx`
- [ ] Type-check + lint groen
- [ ] Handmatige test: dev-tool draait identiek (run agent op een verified meeting → result panel + diff + two-stage tab werken)

## Acceptance criteria

- `wc -l apps/cockpit/src/app/(dashboard)/dev/action-items/run/client.tsx` < 200
- Elke nieuwe `_components/*.tsx` < 200 regels
- Geen `function Result|Diff|Stat|TwoStage|Gated...` definitie in `client.tsx`
- Bestaande dev-tool flow ongewijzigd voor de gebruiker

## Out of scope

- Functionele wijzigingen aan de dev-tool
- `coder-client.tsx` (299 r) in dezelfde route — eventueel volgende sprint
- Stat-component generaliseren naar shared (alleen als hij ergens anders al bestaat)
- Tests voor dev-tools (laag prio, dev-only)

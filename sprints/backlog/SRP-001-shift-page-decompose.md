# Micro Sprint SRP-001: shift/page.tsx decomposeren

## Doel

`apps/cockpit/src/app/(dashboard)/shift/page.tsx` is een statische visie/marketing-pagina van **828 regels** met 11 inline subcomponenten. Een `page.tsx` hoort te composeren, niet alle UI te bevatten. Na deze sprint: page.tsx ≤ 150 regels, alle subcomponenten verhuisd naar `apps/cockpit/src/components/shift/`, en secties (Hero, Before/After, Pipeline, Future) zijn aparte section-componenten.

## Probleem

- 828 regels in één file — meer dan 5× de drempel uit CLAUDE.md (~150 regels)
- 11 inline functions: `MiniNavRow`, `MiniProjectRow`, `PipelineStep`, `NextAction`, `RiskItem`, `WaitingRow`, `ClientWaitingItem`, `DataSourceRow`, `SprintItem`, `FutureItem`, en de page zelf
- De page mengt: hero copy, before/after vergelijking, pipeline-diagram, sprintlijst, future-roadmap — vier secties die elk los gerenderd worden zonder shared state
- Compositiepagina (`components/[naam]/`) volgens CLAUDE.md — maar de map bestaat niet

## Voorgestelde structuur

```
apps/cockpit/src/
├── app/(dashboard)/shift/page.tsx              ← ~80 regels, alleen secties composeren
└── components/shift/
    ├── hero-section.tsx                        ← hero + "De shift" intro
    ├── before-after-section.tsx                ← inclusief MiniNavRow, MiniProjectRow
    ├── pipeline-section.tsx                    ← inclusief PipelineStep, NextAction
    ├── current-state-section.tsx               ← RiskItem, WaitingRow, ClientWaitingItem, DataSourceRow
    ├── future-section.tsx                      ← SprintItem, FutureItem
    └── shared/
        ├── mini-nav-row.tsx                    ← als hergebruikt
        └── pipeline-step.tsx                   ← als hergebruikt
```

## Migratie-stappen

1. Maak `apps/cockpit/src/components/shift/` aan
2. Verhuis subcomponenten één voor één naar eigen files (PascalCase, zelfde props)
3. Splits de JSX van `ShiftPage` in 4-5 section-componenten (HeroSection, BeforeAfterSection, PipelineSection, CurrentStateSection, FutureSection)
4. `page.tsx` wordt: `<HeroSection /> <BeforeAfterSection /> ... </>`
5. Imports updaten — geen externe callers want page is een route

## Deliverables

- [ ] `components/shift/` map met section + leaf components
- [ ] `app/(dashboard)/shift/page.tsx` ≤ 150 regels
- [ ] Geen inline `function MiniNavRow` etc. meer in `page.tsx`
- [ ] `npm run lint`, `npm run type-check` groen
- [ ] Pagina rendert visueel identiek (handmatige check + screenshot diff)

## Acceptance criteria

- `wc -l apps/cockpit/src/app/(dashboard)/shift/page.tsx` < 150
- Geen inline component-definities (functions die JSX returnen) in `page.tsx`
- Elke section-component < 200 regels
- Visuele regressie-check: pagina zelfde layout/copy als voor refactor

## Out of scope

- Inhoud/copy aanpassen (alleen structurele refactor)
- Shift-pagina dynamisch maken (blijft `force-static`)
- Naar `features/` migreren (page is read-only marketing, geen actions)

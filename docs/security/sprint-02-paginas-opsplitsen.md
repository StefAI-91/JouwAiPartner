# Micro Sprint 02: Pagina's opsplitsen (SRP)

## Doel

Twee pagina's schenden het Single Responsibility Principle en de ~150 regels richtlijn uit CLAUDE.md. De architectuur-pagina (823 regels) en help-pagina (278 regels) bevatten data arrays, helper components en rendering allemaal in een bestand. Deze sprint splitst beide pagina's op zodat data in `lib/data/`, componenten in `components/[feature]/` en de page alleen composeert.

## Fixes

| #   | Beschrijving                                                                        |
| --- | ----------------------------------------------------------------------------------- |
| F4  | Architectuur pagina opsplitsen (823 regels --> ~80 regels page + data + components) |
| F5  | Help pagina opsplitsen (278 regels --> ~60 regels page + data + components)         |

## Context

### Architectuur pagina (`src/app/(dashboard)/architectuur/page.tsx`, 823 regels)

De pagina bevat:

- **Types** (regels 1-40): `LayerProps`, interfaces voor `McpTool`, `SeedSection`, `RoadmapItem`, `TestResult`
- **Data arrays** (regels 42-550+): `layers[]`, `mcpTools[]`, `seedSection`, `roadmapItems[]`, `testResults[]` -- grote arrays met hardcoded content
- **Helper components** (regels 550-700+): `LayerCard`, `ToolCard`, `StatusBadge`, `FlowArrow` -- inline component functies
- **Page component** (regels 700-823): de daadwerkelijke pagina die alles composeert

Dit moet worden:

1. `src/lib/data/architectuur.ts` -- alle data arrays en hun type-interfaces (geen React, puur TypeScript)
2. `src/components/architectuur/layer-card.tsx` -- LayerCard component
3. `src/components/architectuur/tool-card.tsx` -- ToolCard component
4. `src/components/architectuur/status-badge.tsx` -- StatusBadge component
5. `src/components/architectuur/flow-arrow.tsx` -- FlowArrow component
6. `src/app/(dashboard)/architectuur/page.tsx` -- ~80 regels, alleen imports en compositie

### Help pagina (`src/app/(dashboard)/help/page.tsx`, 278 regels)

De pagina bevat:

- **Types** (regels 1-30): `FeatureCardProps` interface
- **FeatureCard component** (regels 31-70): inline component functie
- **Data arrays** (regels 70-200+): `features[]`, `pipelineSteps[]`, `faqs[]`
- **Page component** (regels 200-278): compositie

Dit moet worden:

1. `src/lib/data/help.ts` -- alle data arrays en type-interfaces
2. `src/components/help/feature-card.tsx` -- FeatureCard component
3. `src/app/(dashboard)/help/page.tsx` -- ~60 regels, alleen imports en compositie

### Regels uit CLAUDE.md

- "Splits bij ~150 regels. Component te groot? Splits het."
- "Single responsibility: elk bestand doet een ding. Page composeert, component rendert."
- "Wanneer nieuwe folders: feature-folder in components/ bij 2+ eigen componenten."

### Belangrijk bij het splitsen

- Lucide icon imports zijn React-specifiek. De data files in `lib/data/` mogen geen React importeren. Los dit op door icon names als strings op te slaan in data en een icon-lookup te gebruiken in de component, OF door de icon-import in de page/component te doen.
- De data arrays bevatten referenties naar Lucide icons (`icon: Mic`, `icon: Brain`). Dit zijn component references (LucideIcon type). Twee opties:
  - Optie A: Data file exporteert icon mapping met string keys, component doet de lookup
  - Optie B: Data file importeert uit lucide-react (dit is OK want lucide-react heeft geen React runtime dependency bij type-level imports)
- Kies de optie die het minste code oplevert en het meest leesbaar is.

## Prerequisites

Geen -- deze sprint is onafhankelijk van sprint 01.

## Taken

- [ ] **Taak 1: Architectuur data extraheren** -- Maak `src/lib/data/architectuur.ts`. Verplaats alle type-interfaces (`LayerProps`, etc.) en data arrays (`layers`, `mcpTools`, `seedSection`, `roadmapItems`, `testResults`) uit de page. Exporteer alles met named exports.

- [ ] **Taak 2: Architectuur componenten extraheren** -- Maak de folder `src/components/architectuur/` met:
  - `layer-card.tsx`: LayerCard component (accepteert LayerProps via props)
  - `tool-card.tsx`: ToolCard component
  - `status-badge.tsx`: StatusBadge component
  - `flow-arrow.tsx`: FlowArrow component
    Elk component importeert zijn eigen UI dependencies (Card, Badge, etc.).

- [ ] **Taak 3: Architectuur page herschrijven** -- `src/app/(dashboard)/architectuur/page.tsx` wordt ~80 regels: imports van data + components, page component die alles composeert met `.map()` calls.

- [ ] **Taak 4: Help data extraheren** -- Maak `src/lib/data/help.ts`. Verplaats type-interfaces en data arrays (`features`, `pipelineSteps`, `faqs`) uit de page.

- [ ] **Taak 5: Help component extraheren** -- Maak `src/components/help/feature-card.tsx` met het FeatureCard component.

- [ ] **Taak 6: Help page herschrijven** -- `src/app/(dashboard)/help/page.tsx` wordt ~60 regels. Verify met `npm run build`.

## Acceptatiecriteria

- [ ] [F4] `src/app/(dashboard)/architectuur/page.tsx` is minder dan 120 regels
- [ ] [F4] Alle data arrays staan in `src/lib/data/architectuur.ts`
- [ ] [F4] Alle helper components staan in `src/components/architectuur/`
- [ ] [F4] De architectuur pagina rendert identiek aan de huidige versie (visueel ongewijzigd)
- [ ] [F5] `src/app/(dashboard)/help/page.tsx` is minder dan 100 regels
- [ ] [F5] Data arrays staan in `src/lib/data/help.ts`
- [ ] [F5] FeatureCard staat in `src/components/help/feature-card.tsx`
- [ ] [F5] De help pagina rendert identiek aan de huidige versie
- [ ] `npm run build` slaagt zonder fouten
- [ ] `npm run lint` slaagt zonder fouten

## Geraakt door deze sprint

- `src/lib/data/architectuur.ts` (nieuw)
- `src/components/architectuur/layer-card.tsx` (nieuw)
- `src/components/architectuur/tool-card.tsx` (nieuw)
- `src/components/architectuur/status-badge.tsx` (nieuw)
- `src/components/architectuur/flow-arrow.tsx` (nieuw)
- `src/app/(dashboard)/architectuur/page.tsx` (herschreven)
- `src/lib/data/help.ts` (nieuw)
- `src/components/help/feature-card.tsx` (nieuw)
- `src/app/(dashboard)/help/page.tsx` (herschreven)

## Complexiteit

**Laag-Middel** -- Puur mechanisch verplaatsen van code. Geen logica-wijzigingen. Enige aandachtspunt is het correct afhandelen van Lucide icon imports in data files.

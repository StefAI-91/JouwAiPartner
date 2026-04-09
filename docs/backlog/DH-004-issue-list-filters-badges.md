# Micro Sprint DH-004: Issue list, filters en badge components

## Doel

De issue list pagina bouwen: een compacte tabelweergave van alle issues met filtermogelijkheden op status, priority, type, component en assigned_to. Inclusief de sidebar met status counts en alle shared badge components (priority, status, type, component). Na deze sprint kun je de volledige lijst issues zien, filteren en navigeren.

## Requirements

| ID     | Beschrijving                                                                                                                                  |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| UI-101 | Issue list: tabel/list view (niet kaarten), compact, veel informatie per regel                                                                |
| UI-102 | Issue list kolommen: priority indicator, titel, type badge, component badge, assigned avatar, status, created date                            |
| UI-103 | Issue list sortering: standaard op priority (urgent eerst), secundair op created_at (nieuwst eerst)                                           |
| UI-104 | Issue list filters: status (multi-select), priority (multi-select), type (multi-select), component (multi-select), assigned_to (multi-select) |
| UI-105 | Issue list sidebar: snelle navigatie op status (Triage, Backlog, Todo, In Progress, Done) met counts. Triage bovenaan met oranje badge        |
| UI-106 | Project switcher: dropdown in top navigation bar                                                                                              |
| UI-107 | Project switcher: toont alle projecten                                                                                                        |
| UI-108 | Project switcher: selectie opgeslagen in localStorage                                                                                         |
| UI-109 | Project switcher: URL bevat geen project, het is een app-level filter                                                                         |
| UI-117 | Sidebar navigatie: Triage, Backlog, Todo, In Progress, Done met counts                                                                        |
| UI-118 | Linear-inspired UI: minimalistisch, snel                                                                                                      |
| UI-126 | Shared component: priority-badge.tsx                                                                                                          |
| UI-127 | Shared component: status-badge.tsx                                                                                                            |
| UI-128 | Shared component: type-badge.tsx                                                                                                              |
| UI-129 | Shared component: component-badge.tsx                                                                                                         |

## Bronverwijzingen

- PRD: `docs/specs/prd-devhub.md` -> sectie "Issue List" (regels 729-740)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Layout" (regels 691-715)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Project Switcher" (regels 783-788)
- PRD: `docs/specs/prd-devhub.md` -> sectie "App structuur — components" (regels 839-858)

## Context

### Issue list layout

```
┌──────────┬──────────────────────────────────────────────────┐
│          │  Issue List                                      │
│ Sidebar  │                                                  │
│          │  ┌─ Filter bar ────────────────────────────┐     │
│ > Backlog│  │ Status v  Priority v  Type v  Assigned v│     │
│ > Todo   │  └────────────────────────────────────────────┘  │
│ > In     │                                                  │
│  Progress│  # ● Login page crash on Safari      urgent  P1  │
│ > Done   │  # ● API timeout bij upload > 5MB     high   P2  │
│          │  # ○ Dark mode toggle werkt niet      medium  P3  │
│ ─────────│  # ○ Voeg export functie toe          low     FR  │
│ Filters  │  # ○ Hoe werkt de zoekfunctie?        low     Q   │
│ Labels   │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

### Kolommen per issue row

1. **Priority indicator** — kleur-gecodeerd bolletje (rood=urgent, oranje=high, geel=medium, grijs=low)
2. **Issue nummer** — `#42`
3. **Titel** — truncated als te lang
4. **Type badge** — Bug / Feature Request / Question (kleine badge)
5. **Component badge** — Frontend / Backend / etc. (kleine badge)
6. **Assigned avatar** — initialen of avatar van de toegewezen persoon
7. **Status** — badge met kleur
8. **Created date** — relatief ("3 uur geleden") of absoluut

### Sortering

Standaard: priority (urgent eerst), dan created_at (nieuwst eerst).
Priority order: urgent > high > medium > low.

### Filter bar

Multi-select dropdowns voor:

- **Status**: backlog, todo, in_progress, done, cancelled
- **Priority**: urgent, high, medium, low
- **Type**: bug, feature_request, question
- **Component**: frontend, backend, api, database, prompt_ai, unknown
- **Assigned to**: lijst van teamleden

Filters worden als URL search params doorgegeven zodat ze deelbaar zijn.

### Sidebar status counts

De sidebar toont het aantal issues per status voor het geselecteerde project:

- Backlog (12)
- Todo (5)
- In Progress (3)
- Done (24)

Klikken op een status filtert de lijst. Gebruik `getIssueCounts` query uit DH-002.

### Badge components

Elke badge is een klein component dat een waarde toont met passende kleur:

**priority-badge.tsx:**

- urgent: rood
- high: oranje
- medium: geel
- low: grijs

**status-badge.tsx:**

- backlog: grijs
- todo: blauw
- in_progress: geel/amber
- done: groen
- cancelled: rood/doorgestreept

**type-badge.tsx:**

- bug: rood
- feature_request: paars
- question: blauw

**component-badge.tsx:**

- Neutrale kleuren per component (frontend, backend, api, database, prompt_ai, unknown)

### Data ophalen

De `/issues` pagina is een Server Component die:

1. Het geselecteerde project leest (via cookie of query param — de project switcher slaat dit op)
2. `listIssues()` aanroept met de filters uit de URL search params
3. `getIssueCounts()` aanroept voor de sidebar counts
4. De data doorgeeft aan client components voor interactieve filters

## Prerequisites

- [ ] Micro Sprint DH-002: Queries en mutations (listIssues, getIssueCounts)
- [ ] Micro Sprint DH-003: DevHub app setup + auth + layout (app shell met sidebar)

## Taken

- [ ] Maak badge components: `src/components/shared/priority-badge.tsx`, `status-badge.tsx`, `type-badge.tsx`, `component-badge.tsx`
- [ ] Maak `src/components/issues/issue-row.tsx` — enkele rij in de lijst
- [ ] Maak `src/components/issues/issue-list.tsx` — tabel component die rows rendert
- [ ] Maak `src/components/issues/issue-filters.tsx` — filter bar met multi-select dropdowns (client component)
- [ ] Maak `src/components/issues/issue-sidebar.tsx` — status navigatie met counts
- [ ] Update `src/app/issues/page.tsx` — Server Component die data ophaalt en components rendert

## Acceptatiecriteria

- [ ] [UI-101] Issue list toont een compacte tabelweergave, geen kaarten
- [ ] [UI-102] Elke row toont: priority indicator, issue nummer, titel, type badge, component badge, assigned avatar, status, created date
- [ ] [UI-103] Lijst is standaard gesorteerd op priority (urgent eerst), dan created_at (nieuwst)
- [ ] [UI-104] Filter bar heeft werkende multi-select dropdowns voor status, priority, type, component, assigned_to
- [ ] [UI-105] Sidebar toont status counts en klikken filtert de lijst
- [ ] [UI-117] Sidebar navigatie items tonen correcte counts per status
- [ ] [UI-118] UI is minimalistisch en snel (Linear-inspired)
- [ ] [UI-126] priority-badge.tsx toont correcte kleuren per priority level
- [ ] [UI-127] status-badge.tsx toont correcte kleuren per status
- [ ] [UI-128] type-badge.tsx onderscheidt bug, feature_request, question visueel
- [ ] [UI-129] component-badge.tsx toont component naam met passende styling
- [ ] Filters worden als URL search params doorgegeven (deelbare URLs)

## Geraakt door deze sprint

- `apps/devhub/src/components/shared/priority-badge.tsx` (nieuw)
- `apps/devhub/src/components/shared/status-badge.tsx` (nieuw)
- `apps/devhub/src/components/shared/type-badge.tsx` (nieuw)
- `apps/devhub/src/components/shared/component-badge.tsx` (nieuw)
- `apps/devhub/src/components/issues/issue-row.tsx` (nieuw)
- `apps/devhub/src/components/issues/issue-list.tsx` (nieuw)
- `apps/devhub/src/components/issues/issue-filters.tsx` (nieuw)
- `apps/devhub/src/components/issues/issue-sidebar.tsx` (nieuw)
- `apps/devhub/src/app/issues/page.tsx` (bijgewerkt)

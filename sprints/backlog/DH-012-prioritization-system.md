# Micro Sprint DH-012: Prioritization System (P0/P1/P2/P3) + Deze Week op dashboard

## Doel

Maak prioriteit zichtbaar en actiegericht in DevHub. Drie ingrepen die op
elkaar voortbouwen:

1. **Hernoem** de bestaande prio-niveaus naar P0/P1/P2/P3 met heldere
   definities en SLA's. Geen DB-migratie — alleen labels en visualisatie.
2. **Triage wordt een echte stap.** De reviewer (Stef of dev) kan een issue
   pas uit triage halen door zowel een prio (P0–P3) als een vervolgstatus
   te kiezen. Prio-keuze wordt visueel prominent in plaats van weggestopt
   in een sidebar-dropdown. Status volgt automatisch uit prio (P0/P1 →
   `todo`, P2/P3 → `backlog`) — één klik minder.
3. **Sectie "Deze week" op het dashboard** met team-focus: bovenaan open
   P0+P1 (gegroepeerd per persoon, inclusief unassigned), daaronder alles
   met status `in_progress` (wat er actief loopt). Geen aparte route, geen
   extra sidebar-item — past in de bestaande dashboardpagina (`/`).

Na deze sprint zien beide triagisten meteen welke issues nog géén prio
hebben, en heeft het team één centrale plek om te zien wat er deze week
brandt en wie waaraan werkt.

## Scope-besluiten (door Stef bevestigd)

- ✅ Hernoemen via labels (geen DB-migratie van keys `urgent`/`high`/`medium`/`low`)
- ❌ Géén AI suggested priority in deze sprint (eventueel later)
- ✅ "Deze week" als **sectie op het dashboard**, géén aparte route `/mijn-week` of `/deze-week`
- ✅ "Deze week" toont **alle teamleden** (niet gefilterd op ingelogde user) — past bij jullie schaal (3 reviewers + dev) en de keuze "iedereen ziet alles"
- ✅ "Deze week" combineert urgent (P0+P1 open, alle status) + actief (`in_progress`, alle prio)
- ✅ Status volgt automatisch uit prio in triage (P0/P1 → `todo`, P2/P3 → `backlog`); reviewer kan overrulen via sidebar als nodig

## Naming & definities (bron van waarheid)

| DB key   | Label (nieuw)         | Definitie                                           | SLA           | Kleur  |
| -------- | --------------------- | --------------------------------------------------- | ------------- | ------ |
| `urgent` | **P0 — Kritiek**      | Productie down, data verlies, klant kan niet werken | Vandaag       | Rood   |
| `high`   | **P1 — Urgent**       | Belangrijke functie kapot, geen workaround          | Deze week     | Oranje |
| `medium` | **P2 — Normaal**      | Werkt wel maar suboptimaal, of workaround mogelijk  | Binnen 2 wkn  | Geel   |
| `low`    | **P3 — Nice-to-have** | Polish, kleine feature requests, geen blokkade      | Wanneer ruimt | Grijs  |

DB-keys blijven onveranderd om Slack-integratie (`resolveSlackEvent`),
seeds en bestaande filters niet te breken. Labels worden centraal beheerd
in `packages/database/src/constants/issues.ts` (`ISSUE_PRIORITY_LABELS`)
en `apps/devhub/src/components/shared/priority-badge.tsx`
(`PRIORITY_CONFIG`).

## Requirements

| ID            | Beschrijving                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| FUNC-DH-12-1  | `ISSUE_PRIORITY_LABELS` toont nieuwe labels (P0 — Kritiek, P1 — Urgent, P2 — Normaal, P3 — Nice-to-have)       |
| FUNC-DH-12-2  | `PriorityBadge` toont kleur-coded badge (`P0` t/m `P3`) ipv alleen tekst                                       |
| FUNC-DH-12-3  | `issue-row.tsx` vervangt `PriorityDot` door `PriorityBadge` — directe scanbaarheid in lijst                    |
| FUNC-DH-12-4  | Triage-detail toont prominente P0/P1/P2/P3-knoppenrij bovenaan (niet meer alleen sidebar-dropdown)             |
| FUNC-DH-12-5  | Issue verlaat triage pas wanneer reviewer prio kiest + bevestigt; status wordt automatisch afgeleid            |
| FUNC-DH-12-6  | Triage-lijst markeert issues zónder expliciete prio-keuze als "Nog te triëren" (visueel signaal)               |
| FUNC-DH-12-7  | Dashboard-sectie "Deze week — Urgent": open issues met `priority IN (urgent, high)`, gegroepeerd per assignee  |
| FUNC-DH-12-8  | Dashboard-sectie "Deze week — Actief": issues met `status = in_progress` (alle prio), gegroepeerd per assignee |
| FUNC-DH-12-9  | Unassigned P0/P1 verschijnen in eigen "Niemand"-groep met "Claim"-knop (UI-link naar issue-detail)             |
| FUNC-DH-12-10 | Lege "Deze week" toont vriendelijke melding ("Niets urgents, niets actief")                                    |

## Bronverwijzingen

- Huidige labels: `packages/database/src/constants/issues.ts:58-63`
- Huidige PriorityDot: `apps/devhub/src/components/shared/priority-badge.tsx`
- Issue-row: `apps/devhub/src/features/issues/components/issue-row.tsx:151`
- Triage status-key: `packages/database/src/constants/issues.ts:13-21`
- Sidebar nav: `apps/devhub/src/components/layout/sidebar-constants.ts` (geen wijziging — sidebar blijft schoon)
- Dashboardpagina: `apps/devhub/src/app/(app)/page.tsx`
- DashboardMetrics (geen wijziging): `apps/devhub/src/components/dashboard/dashboard-metrics.tsx`
- Bestaande issue-query: `packages/database/src/queries/issues/core.ts`
- AI classifier (zet severity, niet priority — bewust niet aanraken): `apps/devhub/src/features/issues/actions/classify.ts`

## Context

### Waarom geen DB-migratie

De keys `urgent`/`high`/`medium`/`low` zijn op meerdere plekken hard-coded
verweven:

- `PRIORITY_ORDER` map voor sortering
- `resolveSlackEvent` triggert Slack-notificatie bij `priority='urgent'`
- Filter-URLs (`?priority=urgent,high`) in bookmarks/bestaande sessies
- Seeds en activity-logs

Een DB-migratie naar `p0`/`p1`/`p2`/`p3` zou al die plekken moeten raken
en bestaande Slack/filter-state breken. Veel risico voor zero
gebruikerswinst — de gebruiker ziet alleen labels.

**Strategie:** keys = stable identifier, labels = display-laag. Als we
later toch willen migreren is dat een aparte refactor-sprint.

### Visueel: badge in plaats van dot

Huidige `PriorityDot` (een 2.5px gekleurd bolletje) is te subtiel. We
introduceren een tekst-badge:

```tsx
// Voor (issue-row.tsx:151)
<PriorityDot priority={issue.priority} />

// Na
<PriorityBadge priority={issue.priority} variant="compact" />
// Rendert: 🔴 P0  /  🟠 P1  /  🟡 P2  /  ⚪ P3
```

`PriorityBadge` bestaat al maar wordt momenteel niet gebruikt in de lijst.
We voegen een `variant="compact"` toe voor list-context (kleinere
typografie, vaste breedte zodat de kolom uitlijnt).

### Triage-flow met dwang + auto-status

De triage-detail krijgt bovenaan een prominente prio-rij — alleen prio,
status volgt automatisch:

```
┌─────────────────────────────────────────────────────┐
│  Kies prioriteit:  [P0]  [P1]  [P2]  [P3]           │
│                                                      │
│  → P0/P1 gaat naar "Te doen"                        │
│  → P2/P3 gaat naar "Backlog"                        │
│                                          [Bevestig]  │
└─────────────────────────────────────────────────────┘
```

Reviewer ziet meteen welke status erbij hoort (mini-tekst onder de
knoppenrij, dynamisch op basis van geselecteerde prio). Bevestig-knop
disabled tot prio gekozen is. Sidebar-dropdown blijft bestaan voor
override-cases — maar voor de **eerste** triage is de knoppenrij de
hoofdroute.

**Waarom auto-status:**

- P0/P1 hoort altijd in `todo` (anders staat het stil terwijl het brandt)
- P2/P3 hoort altijd in `backlog` (anders verdwijnt het in de actieve werklijst)
- Eén klik minder = sneller triage
- Reviewer kan via sidebar-dropdown alsnog wisselen voor edge cases

**Waarom dwang:** voorkomt dat issues per ongeluk in triage blijven
hangen. Beide triagisten (Stef en dev) volgen dezelfde flow — wie 'm
eerst opent en bevestigt, claimt 'm.

### Dashboard-sectie "Deze week"

Visuele opzet (komt na `DashboardMetrics`, vóór `IssuesIntakeChart`):

```
┌─ Deze week ──────────────────────────────────────────────┐
│                                                           │
│  🔥 Urgent (P0 + P1, open)                               │
│  ──────────────────────────────────────                   │
│  👤 Wouter (2)                                            │
│     #142 Login werkt niet meer       [P0]                │
│     #138 PDF-export geeft lege pag.  [P1]                │
│                                                           │
│  👤 Stef (1)                                              │
│     #134 Filters resetten zichzelf   [P1]                │
│                                                           │
│  ❓ Niemand (1)                                           │
│     #156 Tooltip te kort op mobile   [P1]   [Claim →]    │
│                                                           │
│  ⚙️  Actief in behandeling (status = in_progress)        │
│  ──────────────────────────────────────                   │
│  👤 Wouter (1)                                            │
│     #110 Onboarding flow             [P2]                │
│                                                           │
│  👤 Ege (1)                                               │
│     #112 Email templates             [P2]                │
└───────────────────────────────────────────────────────────┘
```

**Twee subsecties, beide gegroepeerd per assignee:**

| Sectie | Filter                                        | Sortering                                     |
| ------ | --------------------------------------------- | --------------------------------------------- |
| Urgent | `priority IN ('urgent','high')` + open status | Per assignee, daarbinnen op prio + updated_at |
| Actief | `status = 'in_progress'`                      | Per assignee, daarbinnen op prio + updated_at |

**Een issue dat zowel P1 als `in_progress` is, verschijnt in beide
secties.** Dat is bewust — in de stand-up wil je weten dat het brandt
(Urgent) én dat iemand er actief mee bezig is (Actief).

### Query-strategie

```typescript
// In packages/database/src/queries/issues/core.ts (nieuwe functie)
export async function getDashboardThisWeek(projectId: string) {
  const [urgent, active] = await Promise.all([
    listIssues({
      projectId,
      priority: ["urgent", "high"],
      status: ["triage", "backlog", "todo", "in_progress"], // open
      sort: "priority",
    }),
    listIssues({
      projectId,
      status: ["in_progress"],
      sort: "priority",
    }),
  ]);
  return { urgent, active };
}
```

Hergebruikt de bestaande `listIssues` — geen nieuwe DB-query, geen
nieuwe index. Groepering per assignee gebeurt in de component (kleine
data-set, max ~30 items per project).

### Lege staat

Wanneer beide subsecties leeg zijn:

```
🌿  Geen urgente of actieve issues
    Mooi moment om P2 of P3 op te pakken via /issues.
```

Wanneer alleen "Urgent" leeg is: kop tonen met "0 urgente issues".
Wanneer alleen "Actief" leeg is: kop tonen met "Niemand werkt op iets
nu" — dat is een signaal voor de manager.

## Prerequisites

Geen — alle benodigde infrastructuur (DB-kolom, queries, types,
badge-component, dashboardpagina) bestaat al.

## Taken

**Layer 1 — Constants & labels**

- [ ] Update `ISSUE_PRIORITY_LABELS` in `packages/database/src/constants/issues.ts` naar nieuwe labels
- [ ] Voeg helper `getPriorityShortLabel(priority)` toe (returnt `P0`/`P1`/`P2`/`P3`) — voor compacte UI

**Layer 2 — Visualisatie**

- [ ] Update `PRIORITY_CONFIG` in `apps/devhub/src/components/shared/priority-badge.tsx` met nieuwe labels en kleuren (rood/oranje/geel/grijs)
- [ ] Voeg `variant="compact"` toe aan `PriorityBadge` (smallere padding, korte label `P0` ipv `P0 — Kritiek`)
- [ ] Vervang `<PriorityDot />` door `<PriorityBadge variant="compact" />` in `issue-row.tsx:151`
- [ ] Verifieer dat filter-dropdown (`issue-filters/index.tsx`) de nieuwe labels toont (gebeurt automatisch via `ISSUE_PRIORITY_LABELS`)

**Layer 3 — Triage-flow**

- [ ] Maak `apps/devhub/src/features/issues/components/triage-prio-bar.tsx` (client component met 4 prio-knoppen + bevestig-knop, toont auto-status hint)
- [ ] Toon `TriagePrioBar` bovenaan issue-detail wanneer `issue.status === 'triage'`
- [ ] Bevestig-knop bepaalt status uit prio (P0/P1 → `todo`, P2/P3 → `backlog`) en roept bestaande `updateIssue` action aan met `{ priority, status }` in één call
- [ ] Disable bevestig-knop tot prio gekozen is
- [ ] In `issue-list.tsx`: markeer triage-rijen waarvan priority nog default `medium` is en `ai_classified_at IS NULL` met "Nog te triëren" badge (subtiele amber accent)

**Layer 4 — Dashboard-sectie "Deze week"**

- [ ] Maak query `getDashboardThisWeek(projectId)` in `packages/database/src/queries/issues/core.ts`
- [ ] Voeg test toe voor `getDashboardThisWeek` (gebruikt `describeWithDb` patroon — zie `docs/specs/test-strategy.md §4`)
- [ ] Maak `apps/devhub/src/components/dashboard/this-week-section.tsx` (Server Component, render twee subsecties)
- [ ] Maak `apps/devhub/src/components/dashboard/this-week-group.tsx` (component voor één assignee-groep met avatar + lijst)
- [ ] Integreer `<ThisWeekSection />` in `apps/devhub/src/app/(app)/page.tsx` na `<DashboardMetrics />`, vóór `<IssuesIntakeChart />`
- [ ] Lege-staat varianten zoals beschreven in context (alle leeg / alleen urgent leeg / alleen actief leeg)
- [ ] Unassigned-groep ("Niemand") krijgt visueel accent (amber border) en "Claim"-knop die linkt naar issue-detail

**Layer 5 — Compositiepagina registry**

- [ ] CLAUDE.md feature-registry: `dashboard` staat al onder DevHub > Compositiepagina's, geen wijziging nodig
- [ ] Run `npm run check:features` lokaal om te bevestigen dat de structuur klopt

**Layer 6 — Cleanup**

- [ ] Verwijder mock-pagina `apps/devhub/src/app/(app)/preview-dh-012/` (was tijdelijk voor visuele preview)

## Acceptatiecriteria

- [ ] [FUNC-DH-12-1] Issue-detail sidebar toont nieuwe labels (`P0 — Kritiek` etc.) in dropdown
- [ ] [FUNC-DH-12-2,3] Issue-rij in lijst toont kleur-coded `P0`/`P1`/`P2`/`P3` badge
- [ ] [FUNC-DH-12-4,5] Triage-detail heeft prominente prio-keuze + dynamische status-hint; "Bevestig" disabled tot prio gekozen
- [ ] [FUNC-DH-12-5] Issue verlaat `triage` enkel via expliciete bevestiging; status wordt automatisch afgeleid uit prio
- [ ] [FUNC-DH-12-6] Triage-lijst markeert un-getriageerde issues met "Nog te triëren" amber badge
- [ ] [FUNC-DH-12-7] Dashboard "Deze week — Urgent" toont open P0+P1, gegroepeerd per assignee
- [ ] [FUNC-DH-12-8] Dashboard "Deze week — Actief" toont alle `in_progress`, gegroepeerd per assignee
- [ ] [FUNC-DH-12-9] Unassigned P0/P1 hebben eigen "Niemand"-groep met Claim-link
- [ ] [FUNC-DH-12-10] Lege-staat varianten verschijnen correct
- [ ] Bestaande Slack-integratie blijft werken (priority-key onveranderd)
- [ ] Bestaande URL-filters (`?priority=urgent`) blijven werken
- [ ] Sidebar-nav blijft ongewijzigd (geen extra item)
- [ ] `npm run lint`, `npm run type-check`, `npm test` zijn groen
- [ ] `npm run check:queries` en `npm run check:features` slagen

## Geraakt door deze sprint

**Nieuw:**

- `apps/devhub/src/features/issues/components/triage-prio-bar.tsx`
- `apps/devhub/src/components/dashboard/this-week-section.tsx`
- `apps/devhub/src/components/dashboard/this-week-group.tsx`

**Aangepast:**

- `packages/database/src/constants/issues.ts` (labels + helper)
- `packages/database/src/queries/issues/core.ts` (`getDashboardThisWeek`)
- `apps/devhub/src/components/shared/priority-badge.tsx` (config + compact variant)
- `apps/devhub/src/features/issues/components/issue-row.tsx` (badge ipv dot)
- `apps/devhub/src/features/issues/components/issue-detail.tsx` (toont TriagePrioBar wanneer status=triage)
- `apps/devhub/src/features/issues/components/issue-list.tsx` ("Nog te triëren" markering)
- `apps/devhub/src/app/(app)/page.tsx` (integratie ThisWeekSection)

**Verwijderd:**

- `apps/devhub/src/app/(app)/preview-dh-012/page.tsx` (tijdelijke mock, na implementatie)

**Niet aanraken (bewust):**

- DB-schema (geen migratie)
- `PRIORITY_ORDER` (sortering blijft werken)
- `resolveSlackEvent` (triggert nog steeds op `priority='urgent'`)
- AI classifier (`classify.ts`) — zet severity, niet priority; uit scope
- Sidebar-nav (`sidebar-constants.ts`) — geen extra items
- Userback sync pipeline

## Risico's & open vragen

- **Risico:** dashboard wordt te lang als één project veel open P0/P1's
  heeft. Mitigatie: per assignee-groep max 5 items tonen, "+N meer" link
  naar gefilterde `/issues`-pagina.
- **Risico:** triagisten kiezen alles als P2 om de auto-status `backlog`
  te triggeren (uit twijfel). Mitigatie: SLA-tabel op de triage-bar zelf
  zichtbaar als hint ("P0 = vandaag, P1 = deze week").
- **Open:** moet "Deze week" een collapse-toggle krijgen (per subsectie)
  voor lange lijsten? Default in deze sprint: **nee, altijd open**.
  Toevoegen als feedback komt.
- **Open:** moet Slack-notificatie ook triggeren bij P1 (`high`)? Nu
  alleen bij P0 (`urgent`). Niet in scope, eventueel volgende sprint.

## Volgende sprints (niet in scope)

Tijdens de design-discussie zijn deze items als gat geïdentificeerd —
samen vormen ze een logische DH-013/14/15 reeks:

- **DH-013 Inbox**: @mentions + status-changes notificatie-stream voor
  triagisten en assignees. Linear-stijl. Mogelijk hogere impact dan deze
  prio-sprint, maar groter werk.
- **DH-014 Severity opruimen**: severity (AI) en priority (mens) zijn
  dubbel. Verberg severity in UI of gebruik 'm voor AI-prio-suggestie.
- **DH-015 Sidebar opschonen**: 6 status-items + Topics + Settings is
  te druk. Groeperen of "Afgerond/Geannuleerd" onder filter.

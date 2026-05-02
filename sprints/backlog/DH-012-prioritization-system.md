# Micro Sprint DH-012: Prioritization System (P0/P1/P2/P3) + Mijn Week

## Doel

Maak prioriteit zichtbaar en actiegericht in DevHub. Drie ingrepen die op
elkaar voortbouwen:

1. **Hernoem** de bestaande prio-niveaus naar P0/P1/P2/P3 met heldere
   definities en SLA's. Geen DB-migratie — alleen labels en visualisatie.
2. **Triage wordt een echte stap.** De reviewer (Stef of dev) kan een issue
   pas uit triage halen door zowel een prio (P0–P3) als een vervolgstatus
   (`backlog` of `todo`) te kiezen. Prio-keuze wordt visueel prominent in
   plaats van weggestopt in een sidebar-dropdown.
3. **Aparte pagina `/mijn-week`** die alleen P0+P1 issues toont die aan de
   ingelogde gebruiker zijn toegewezen. Antwoord op de vraag "wat moet ik
   nu doen?".

Na deze sprint heeft de developer één plek om te zien wat urgent is, en
zien beide triagisten meteen welke issues nog géén prio hebben.

## Scope-besluiten (door Stef bevestigd)

- ✅ Hernoemen via labels (geen DB-migratie van keys `urgent`/`high`/`medium`/`low`)
- ❌ Géén AI suggested priority in deze sprint (eventueel later)
- ✅ Aparte pagina `/mijn-week` (geen dashboard-widget)

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

| ID            | Beschrijving                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| FUNC-DH-12-1  | `ISSUE_PRIORITY_LABELS` toont nieuwe labels (P0 — Kritiek, P1 — Urgent, P2 — Normaal, P3 — Nice-to-have) |
| FUNC-DH-12-2  | `PriorityBadge` toont kleur-coded badge (`P0` t/m `P3`) ipv alleen tekst                                 |
| FUNC-DH-12-3  | `issue-row.tsx` vervangt `PriorityDot` door `PriorityBadge` — directe scanbaarheid in lijst              |
| FUNC-DH-12-4  | Triage-detail toont prominente P0/P1/P2/P3-knoppenrij bovenaan (niet meer alleen sidebar-dropdown)       |
| FUNC-DH-12-5  | Issue verlaat triage pas als `priority` én `status` (backlog/todo) door reviewer gezet zijn              |
| FUNC-DH-12-6  | Triage-lijst markeert issues zónder expliciete prio-keuze als "Nog te triëren" (visueel signaal)         |
| FUNC-DH-12-7  | Pagina `/mijn-week` toont open issues met `assigned_to = current_user` en `priority IN (urgent, high)`   |
| FUNC-DH-12-8  | `/mijn-week` groepeert op P0 (boven) → P1, gesorteerd op `updated_at DESC` binnen elke groep             |
| FUNC-DH-12-9  | "Mijn week" verschijnt als nav-item in de DevHub sidebar (icon + label)                                  |
| FUNC-DH-12-10 | Lege staat op `/mijn-week`: vriendelijke melding "Geen urgente issues — adem rustig in"                  |

## Bronverwijzingen

- Huidige labels: `packages/database/src/constants/issues.ts:58-63`
- Huidige PriorityDot: `apps/devhub/src/components/shared/priority-badge.tsx`
- Issue-row: `apps/devhub/src/features/issues/components/issue-row.tsx:151`
- Triage status-key: `packages/database/src/constants/issues.ts:13-21`
- Sidebar nav: `apps/devhub/src/components/layout/sidebar-constants.ts`
- DashboardMetrics (geen wijziging nodig): `apps/devhub/src/components/dashboard/dashboard-metrics.tsx`
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
introduceren een tekst-badge naast het bolletje:

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

### Triage-flow met dwang

De triage-detail krijgt bovenaan een prominente prio-rij:

```
┌─────────────────────────────────────────────────────┐
│  Kies prioriteit:  [P0]  [P1]  [P2]  [P3]           │
│  Volgende status:  ( ) Backlog   (•) Te doen         │
│                                          [Bevestig]  │
└─────────────────────────────────────────────────────┘
```

Pas wanneer beide gezet zijn én de reviewer op "Bevestig" klikt, gaat de
status naar de gekozen waarde (en daarmee verlaat het issue de
triage-bucket). Sidebar-dropdown blijft bestaan voor latere wijzigingen,
maar voor de **eerste** triage is de knoppenrij de hoofdroute.

**Waarom dwang:** voorkomt dat issues per ongeluk in triage blijven
hangen of zonder prio doorrollen naar de backlog. Beide triagisten (Stef

- dev) volgen dezelfde flow, dus geen dubbel werk: wie 'm eerst opent en
  bevestigt, claimt 'm.

### `/mijn-week` query

```typescript
// In packages/database/src/queries/issues/core.ts (nieuwe functie)
export async function listMyWeekIssues(userId: string, projectIds: string[]) {
  // priority IN ('urgent', 'high')
  // AND status NOT IN ('done', 'cancelled')
  // AND assigned_to = userId
  // AND project_id IN projectIds
  // ORDER BY priority weight ASC, updated_at DESC
}
```

Geen nieuwe DB-velden, geen nieuwe index nodig — bestaande filters
volstaan. Resultaat wordt client-side gegroepeerd op P0/P1.

### Lege staat

`/mijn-week` zonder open P0/P1 issues toont:

```
🌿  Geen urgente issues
    Adem rustig in. P2 en P3 wachten op /issues.
```

Niet alleen voor vibes — het signaleert ook of de prio-niveaus juist
gebruikt worden. Constant 0 P1's = ofwel je doet het goed, ofwel niemand
markeert iets als P1.

## Prerequisites

Geen — alle benodigde infrastructuur (DB-kolom, queries, types, badge-
component, sidebar-nav) bestaat al.

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

- [ ] Maak `apps/devhub/src/features/issues/components/triage-prio-bar.tsx` (client component met 4 prio-knoppen + status-radio + bevestig-knop)
- [ ] Toon `TriagePrioBar` bovenaan issue-detail wanneer `issue.status === 'triage'` (boven beschrijving, onder header)
- [ ] Bevestig-knop roept bestaande `updateIssue` action aan met `{ priority, status }` in één call
- [ ] Disable bevestig-knop tot beide velden gevuld zijn
- [ ] In `issue-list.tsx`: markeer triage-rijen waarvan priority nog default `medium` is en `ai_classified_at IS NULL` met "Nog te triëren" badge (subtiele amber accent)

**Layer 4 — Mijn Week pagina**

- [ ] Maak query `listMyWeekIssues(userId, projectIds)` in `packages/database/src/queries/issues/core.ts`
- [ ] Voeg test toe voor `listMyWeekIssues` (gebruikt `describeWithDb` patroon — zie `docs/specs/test-strategy.md §4`)
- [ ] Maak route `apps/devhub/src/app/(app)/mijn-week/page.tsx` (Server Component)
- [ ] Maak `apps/devhub/src/components/mijn-week/mijn-week-list.tsx` (compositie — leest uit feature, rendert gegroepeerd)
- [ ] Voeg `loading.tsx` en `error.tsx` toe voor de route
- [ ] Voeg "Mijn week" toe aan `NAV_ITEMS` in `sidebar-constants.ts` (icon: `Sparkles` of `Target`, plaats: bovenaan, vóór "Triage")
- [ ] Lege-staat component met copy zoals beschreven in context

**Layer 5 — Compositiepagina registry**

- [ ] Update CLAUDE.md feature-registry tabel: voeg `mijn-week` toe onder DevHub > Compositiepagina's
- [ ] Run `npm run check:features` lokaal om te bevestigen dat de structuur klopt

## Acceptatiecriteria

- [ ] [FUNC-DH-12-1] Issue-detail sidebar toont nieuwe labels (`P0 — Kritiek` etc.) in dropdown
- [ ] [FUNC-DH-12-2,3] Issue-rij in lijst toont kleur-coded `P0`/`P1`/`P2`/`P3` badge
- [ ] [FUNC-DH-12-4,5] Triage-detail heeft prominente prio+status-keuze; "Bevestig" disabled tot beide gezet
- [ ] [FUNC-DH-12-5] Issue verlaat `triage` enkel via expliciete bevestiging (niet stiekem via sidebar)
- [ ] [FUNC-DH-12-6] Triage-lijst markeert un-getriageerde issues met "Nog te triëren" amber badge
- [ ] [FUNC-DH-12-7,8] `/mijn-week` toont alleen open P0+P1 issues van ingelogde user, gegroepeerd P0 → P1
- [ ] [FUNC-DH-12-9] "Mijn week" staat als eerste item in DevHub sidebar
- [ ] [FUNC-DH-12-10] Lege staat verschijnt wanneer er geen open P0/P1 issues zijn voor de gebruiker
- [ ] Bestaande Slack-integratie blijft werken (priority-key onveranderd)
- [ ] Bestaande URL-filters (`?priority=urgent`) blijven werken
- [ ] `npm run lint`, `npm run type-check`, `npm test` zijn groen
- [ ] `npm run check:queries` en `npm run check:features` slagen

## Geraakt door deze sprint

**Nieuw:**

- `apps/devhub/src/features/issues/components/triage-prio-bar.tsx`
- `apps/devhub/src/components/mijn-week/mijn-week-list.tsx`
- `apps/devhub/src/app/(app)/mijn-week/page.tsx`
- `apps/devhub/src/app/(app)/mijn-week/loading.tsx`
- `apps/devhub/src/app/(app)/mijn-week/error.tsx`

**Aangepast:**

- `packages/database/src/constants/issues.ts` (labels + helper)
- `packages/database/src/queries/issues/core.ts` (`listMyWeekIssues`)
- `apps/devhub/src/components/shared/priority-badge.tsx` (config + compact variant)
- `apps/devhub/src/features/issues/components/issue-row.tsx` (badge ipv dot)
- `apps/devhub/src/features/issues/components/issue-detail.tsx` (toont TriagePrioBar wanneer status=triage)
- `apps/devhub/src/features/issues/components/issue-list.tsx` ("Nog te triëren" markering)
- `apps/devhub/src/components/layout/sidebar-constants.ts` (Mijn Week nav-item)
- `CLAUDE.md` (feature-registry)

**Niet aanraken (bewust):**

- DB-schema (geen migratie)
- `PRIORITY_ORDER` (sortering blijft werken)
- `resolveSlackEvent` (triggert nog steeds op `priority='urgent'`)
- AI classifier (`classify.ts`) — zet severity, niet priority; uit scope
- Userback sync pipeline

## Risico's & open vragen

- **Risico:** "Mijn week" wordt leeg als triagisten alles als P2 markeren
  uit gewoonte. Mitigatie: SLA-tabel in onboarding-doc, evt. follow-up
  sprint voor "P-distributie per week" metric.
- **Open:** wil Stef dat `/mijn-week` cross-project is (alle projecten van
  de user) of per-project filterbaar? Default in deze sprint: **cross-
  project**, project-filter via URL-param (`?project=...`) als optie.
- **Open:** moet "Mijn week" ook P0+P1 tonen die unassigned zijn (claim-
  flow)? Voorlopig nee — alleen `assigned_to = me`. Unassigned kritieke
  issues worden al gedekt door dashboard-tegel "Kritiek zonder assignee".

# Micro Sprint CP-008: Portal Vier-Bucket Dashboard

## Doel

De issue-overzichtspagina van de portal (`/projects/[id]/issues`) ombouwen van de huidige enkel-status `IssueStatusFilter`-view naar een vier-koloms bucketweergave met source-switch en type-tabs (Alles / Bugs / Features / Vragen). Klanten zien daarna in één blik de volledige projectstand zonder verborgen issues — transparantie via source-switch i.p.v. visibility-toggle.

## Requirements

| ID           | Beschrijving                                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| BUCKET-V1-01 | `listPortalIssues` accepteert optionele filters `sourceGroup?: 'client' \| 'jaip'` en `types?: IssueType[]` (filter op DB, geen JS-filter)   |
| BUCKET-V1-02 | `listPortalIssues`-select bevat `client_title`, `client_description`, `source` (en `type`/`priority` zoals al)                               |
| BUCKET-V1-03 | Pagina `/projects/[id]/issues` rendert 4 bucket-kolommen op desktop (Ontvangen / Ingepland / In behandeling / Afgerond), gestapeld op mobiel |
| BUCKET-V1-04 | Per bucket een telling (uit `getProjectIssueCounts`); skeleton loaders per bucket; lege-bucket-state ("Geen items")                          |
| BUCKET-V1-05 | Source-switch tabs (Alles / Onze meldingen / JAIP-meldingen) — default Alles, geserialiseerd als `?source=` query-param                      |
| BUCKET-V1-06 | Type-filter tabs (Alles / Bugs / Features / Vragen) — orthogonaal aan source-switch, geserialiseerd als `?type=` query-param                 |
| BUCKET-V1-07 | Issue-cards tonen `client_title \|\| title` als heading + subtiele source-indicator (icoon of badge) via `resolvePortalSourceGroup`          |
| BUCKET-V1-08 | Onbekende `source`-waarden vallen onder JAIP-meldingen (defensieve fallback via `resolvePortalSourceGroup`)                                  |
| BUCKET-V1-09 | Paginering binnen bucket: 25 per scroll/load (laat de bestaande `range`-pagination van `listPortalIssues` werken)                            |
| BUCKET-V1-10 | Mobiele weergave is leesbaar zonder horizontaal scrollen (kolommen → verticaal stack onder `md`)                                             |
| BUCKET-V1-11 | Feedback-formulier (CP-005) blijft functioneel — ingediend issue verschijnt direct in `Ontvangen` onder "Onze meldingen"                     |

## Afhankelijkheden

- **CP-006** (schema foundation) — `client_title`, `client_description`, `PORTAL_SOURCE_GROUPS`, `resolvePortalSourceGroup`
- CP-004 (issue tracker basis) — bestaande `IssueList`/`IssueStatusFilter`-componenten als referentie
- CP-007 (DevHub editor) — _zacht_: zonder ingevulde hertalingen valt alles terug op `title`/`description`; CP-008 werkt zonder, maar valideren is leuker mét

## Taken

### 1. Portal-queries uitbreiden

- `packages/database/src/queries/portal/core.ts`:
  - `PortalIssue`-interface uitbreiden met `client_title: string | null`, `client_description: string | null`, `source: string`, `type: string` (al aanwezig?), `priority: string` (al aanwezig?)
  - `PORTAL_ISSUE_COLS` uitbreiden met `client_title, client_description, source` (`type`/`priority` zaten er al)
  - `listPortalIssues` parameter-shape uitbreiden:

    ```typescript
    filters?: {
      status?: PortalStatusFilter;
      sourceGroup?: PortalSourceGroupKey;
      types?: IssueType[];
      limit?: number;
      offset?: number;
    }
    ```

  - Filter-logica:
    - `sourceGroup === 'client'` → `.in("source", ["portal", "userback"])`
    - `sourceGroup === 'jaip'` → `.in("source", ["manual", "ai"])` (onbekende sources mappen we niet via DB; UI gebruikt `resolvePortalSourceGroup` voor de indicator)
    - `types?.length` → `.in("type", types)`
  - `getPortalIssue` selectie aanvullen met dezelfde nieuwe velden

### 2. URL-state parsing

- `apps/portal/src/app/(app)/projects/[id]/issues/page.tsx`:
  - `searchParams` uitbreiden naar `{ source?: string; type?: string }`
  - Parse-helpers (vergelijkbaar met `parseFilter` voor status):
    - `parseSourceGroup(raw)` → `'client' | 'jaip' | null`
    - `parseTypes(raw)` → `IssueType[] | null` (komma-gescheiden of single)
  - Geen `status`-query-param meer (4-bucket view toont alle 4 tegelijk); de oude `IssueStatusFilter`-component verdwijnt uit deze pagina

### 3. Bucket-dashboard component

- Nieuw `apps/portal/src/components/issues/bucket-dashboard.tsx` (server-component):
  - Props: `projectId`, `issues: PortalIssue[]`, `counts: PortalIssueCounts`
  - Verdeel `issues` over 4 buckets via `INTERNAL_STATUS_TO_PORTAL_KEY`
  - Render 4 kolommen (`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4`)
  - Per kolom: header met label uit `PORTAL_STATUS_LABELS` + telling uit `counts`
  - Lege-bucket-state: "Geen items" in `text-muted-foreground`

### 4. Source-switch + type-tabs

- `apps/portal/src/components/issues/source-switch.tsx` (client-component, gebruikt `Link` met `?source=`):
  - 3 tabs: Alles / Onze meldingen / JAIP-meldingen
  - Active-state op basis van prop `active: PortalSourceGroupKey | null`
- `apps/portal/src/components/issues/type-filter.tsx` (client-component):
  - 4 tabs: Alles / Bugs / Features / Vragen
  - Mapping: Bugs → `bug`, Features → `feature_request`, Vragen → `question`
  - Active-state via prop
- Beide tabs orthogonaal — een klik op source-switch behoudt de actieve type-tab en vice versa (URL-merging)

### 5. Issue-card component

- Vervang/refactor bestaande issue-card (bekijk `apps/portal/src/components/issues/issue-list.tsx`):
  - Heading: `client_title ?? title`
  - Source-badge: gebruik `resolvePortalSourceGroup(source)` → label "Onze melding" of "JAIP" — als subtiel icoon (Lucide `Inbox` voor client, `Shield` voor JAIP) met tooltip
  - Toon `type` als badge (bestaand `IssueTypeBadge`), `priority` als kleurpunt, `updated_at` relatief ("Bijgewerkt 2 dagen geleden")
  - Klik → `/projects/[id]/issues/[issueId]` (bestaande detail-route)

### 6. Page-integratie

- `apps/portal/src/app/(app)/projects/[id]/issues/page.tsx`:
  - Verwijder `IssueStatusFilter` import/render
  - Roep `listPortalIssues` met de geparseerde filters
  - Roep `getProjectIssueCounts` (bestaand) — _let op:_ counts moeten dezelfde `sourceGroup`+`types`-filters respecteren; pas `getProjectIssueCounts` parallel uit als dat nog niet kan, of voeg een aparte `getFilteredProjectIssueCounts` toe
  - Render `<SourceSwitch>` + `<TypeFilter>` + `<BucketDashboard>`

### 7. Loading & error states

- `apps/portal/src/app/(app)/projects/[id]/issues/loading.tsx`:
  - 4 skeleton-kolommen met 3 placeholder-cards per kolom
- `error.tsx` blijft (bestaand) — verifieer dat de retry-knop werkt

### 8. Mobiele check

- Test op viewport 375px (iPhone Safari) en 768px (tablet)
- Bevestig: kolommen stacken verticaal onder `md`, geen horizontaal scrollen

## Verificatie

- [ ] Default-view toont 4 buckets met correcte tellingen op basis van álle issues
- [ ] Source-switch "Onze meldingen" filtert naar `source IN ('portal','userback')`
- [ ] Source-switch "JAIP-meldingen" filtert naar `source IN ('manual','ai')`
- [ ] Type-filter "Vragen" toont alleen `type = 'question'`-issues
- [ ] Source + type tabs combineren (bv. "Onze meldingen" + "Bugs" → alleen bugs van klant)
- [ ] Onbekende source-waarde valt visueel onder "JAIP" (test via DB-insert van bv. `source='slack'`)
- [ ] Issue-card toont `client_title` als gevuld, anders `title`
- [ ] Mobiele view (375px) heeft geen horizontaal scrollen
- [ ] Feedback-formulier indienen → issue verschijnt in Ontvangen onder "Onze meldingen" (regressie-test van CP-005)
- [ ] Type-check slaagt; lint slaagt; `npm run test` slaagt
- [ ] Geen runtime-errors in DevHub of Cockpit (deze sprint mag geen breaking change zijn)

## Bronverwijzingen

- PRD: `docs/specs/prd-client-portal/05-functionele-eisen.md` §5.2 (volledige spec)
- PRD: `docs/specs/prd-client-portal/07-technische-constraints.md` (routes-tabel)
- Bestaand: `packages/database/src/queries/portal/core.ts` — `listPortalIssues`, `getPortalIssue`, `getProjectIssueCounts`
- Bestaand: `apps/portal/src/app/(app)/projects/[id]/issues/page.tsx` — wordt herschreven
- Constants: `PORTAL_STATUS_GROUPS`, `INTERNAL_STATUS_TO_PORTAL_KEY`, `PORTAL_STATUS_LABELS`, en (uit CP-006) `PORTAL_SOURCE_GROUPS` + `resolvePortalSourceGroup`

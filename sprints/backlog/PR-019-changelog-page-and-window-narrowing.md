# Micro Sprint PR-019: Changelog-pagina + Recent-Done Window naar 7 dagen

## Doel

Voorkomen dat de Portal-roadmap een lange scroll-lijst wordt naarmate er
weken voorbij gaan. We versmallen het `recent_done`-venster van 14 → 7
dagen, zodat de "Recent gefixt"-bucket compact blijft, en bouwen een
nieuwe **Changelog-pagina** (`/projects/[id]/changelog`) waar alle
`done`-topics ouder dan 7 dagen automatisch verschijnen — gegroepeerd
per week (`Week van 21 april`), nieuwste week boven, paginated 20
topics per pagina-load.

De roadmap blijft "wat speelt er nu", de changelog wordt "wat is
allemaal opgelost". Klant van CAI ziet alleen CAI-changelog (RLS).

## Requirements

| ID         | Beschrijving                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| PR-REQ-180 | `RECENT_DONE_WINDOW_MS` in `packages/database/src/constants/topics.ts` versmald van 14 → 7 dagen                                           |
| PR-REQ-181 | Nieuwe pagina `/projects/[id]/changelog/page.tsx` toont alle `done`-topics van het project, ongeacht ouderdom                              |
| PR-REQ-182 | Topics gegroepeerd per kalenderweek (maandag–zondag), week-label NL: `Week van 21 april 2026`                                              |
| PR-REQ-183 | Nieuwste week bovenaan, binnen een week nieuwste topic eerst (`closed_at DESC`)                                                            |
| PR-REQ-184 | Initiële load: 20 topics. "Toon meer" via `?limit=40` (cumulatief) — Server Component, geen client state                                   |
| PR-REQ-185 | "Toon meer"-knop verdwijnt als er geen volgende batch is                                                                                   |
| PR-REQ-186 | Per topic in de lijst: titel, type-pill (bug/feature), aantal end-user signals indien >0, datum afsluiting (`23 APR 2026`, mono uppercase) |
| PR-REQ-187 | Empty state: "Nog niets opgeleverd in dit project" als project geen `done`-topics heeft                                                    |
| PR-REQ-188 | Roadmap-pagina krijgt onderaan CTA: `Bekijk volledige changelog →` naar `/projects/[id]/changelog`                                         |
| PR-REQ-189 | Topics jonger dan 7 dagen blijven óók op de changelog zichtbaar (volledige historie); de roadmap-bucket toont ze additioneel — geen gat    |
| PR-REQ-190 | RLS-test: ingelogde klant van project A ziet géén changelog-items van project B; route 404 bij toegangspoging                              |
| PR-REQ-191 | `wont_do` en `wont_do_proposed_by_client` blijven verborgen op de changelog (consistent met roadmap-policy)                                |
| PR-REQ-192 | Pagina is mobile-first; week-headers zijn sticky binnen hun sectie zodat de klant tijdens scroll altijd de week ziet                       |

## Afhankelijkheden

- **PR-001/PR-002** (topics-DB + queries) — `topics.closed_at`, RLS per project
- **PR-004** (Portal roadmap) — voor CTA-koppeling én bestaande `BucketStack`
- **PR-010** (won't-do flow) — verbergt `wont_do` consistent

### Open vragen die VÓÓR deze sprint beantwoord zijn

- Window: 7 dagen (bevestigd)
- Groepering: per kalenderweek, niet per sprint (bevestigd — niet elke `done` heeft sprint-id)
- Pagination: 20 items, cumulatief via `?limit=` (bevestigd)
- Scope: per project, RLS-isolatie (bevestigd)

## Taken

### 1. Constante versmallen

- Update `packages/database/src/constants/topics.ts`:

  ```ts
  const RECENT_DONE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // was 14
  ```

- Update unit-tests in `packages/database/src/constants/__tests__/topics.test.ts` (indien aanwezig) of voeg er één toe: `topicStatusToBucket` retourneert `null` voor done-topic met `closed_at` 8 dagen geleden, `'recent_done'` voor 6 dagen geleden.

### 2. Nieuwe query

- Voeg toe aan `packages/database/src/queries/topics/list.ts`:

  ```ts
  export async function listDoneTopicsForChangelog(
    projectId: string,
    options: { limit: number; client?: SupabaseClient } = { limit: 20 },
  ): Promise<{ topics: TopicListRow[]; hasMore: boolean }>;
  ```

  - Selecteert `TOPIC_LIST_COLS` waar `project_id = projectId`, `status = 'done'`, `closed_at IS NOT NULL`
  - Order: `closed_at DESC`
  - Range: fetch `limit + 1` rijen — als er een extra rij terugkomt is `hasMore: true` en strip de laatste
  - Geen sprint-filter, geen status-filter buiten `done`

- Voeg `listDoneTopicsForChangelog` toe aan de export-barrel van `queries/topics/index.ts`.

### 3. Week-grouping helper

- Maak `apps/portal/src/components/changelog/group-by-week.ts`:

  ```ts
  export type WeekGroup = { weekStart: Date; weekLabel: string; topics: TopicListRow[] };
  export function groupTopicsByWeek(topics: TopicListRow[]): WeekGroup[];
  ```

  - Week start = maandag (NL standaard); gebruik `date-fns` (al in repo via Portal) of pure `Date`-math
  - `weekLabel`: `Week van {d MMMM yyyy}` met NL locale (bv. `Week van 27 april 2026`)
  - Behoud volgorde: nieuwste week eerst, binnen week zelfde volgorde als input

- Unit-test: 5 topics over 2 weken → 2 groepen, juiste labels, juiste verdeling.

### 4. Components

Maak `apps/portal/src/components/changelog/`:

```
apps/portal/src/components/changelog/
├── changelog-list.tsx        # weergave: groepen + load-more link
├── week-section.tsx          # één weekblok met sticky header
├── changelog-row.tsx         # één topic-regel
├── empty-state.tsx           # "Nog niets opgeleverd"
└── group-by-week.ts          # helper (taak 3)
```

- `changelog-list.tsx`:
  - Server Component, props: `weeks: WeekGroup[]`, `hasMore: boolean`, `nextLimit: number`, `projectId: string`
  - Mapt `weeks` naar `<WeekSection>`'s
  - Toont aan het einde de "Toon meer"-link (`<Link href={`/projects/${projectId}/changelog?limit=${nextLimit}`}>`) alleen als `hasMore`
  - Empty state als `weeks.length === 0`

- `week-section.tsx`:
  - Header met week-label, sticky (`sticky top-0` met passende offset voor portal-shell), kleine subtle bg
  - `<ul>` met `<ChangelogRow>`'s

- `changelog-row.tsx`:
  - Layout: titel links, rechts datum-mono (`23 APR 2026`)
  - Type-pill onder titel (hergebruik bestaande pill uit roadmap-bucket-stack)
  - Optionele subline: `{n} reacties van eindgebruikers` als signals > 0
  - Geen link/expand in v1 — flat list (PR-detail komt later als gewenst)

- `empty-state.tsx`:
  - Centered, paper-cream achtergrond, "Nog niets opgeleverd in dit project"

### 5. Route

- `apps/portal/src/app/(app)/projects/[id]/changelog/page.tsx`:

  ```ts
  export default async function ChangelogPage({
    params,
    searchParams,
  }: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ limit?: string }>;
  }) {
    const { id } = await params;
    const { limit: limitParam } = await searchParams;
    const limit = clampLimit(parseInt(limitParam ?? '20', 10)); // min 20, max 200
    const supabase = await createPageClient();
    const { topics, hasMore } = await listDoneTopicsForChangelog(id, { limit, client: supabase });
    const weeks = groupTopicsByWeek(topics);
    return <ChangelogList weeks={weeks} hasMore={hasMore} nextLimit={limit + 20} projectId={id} />;
  }
  ```

- `clampLimit` lokaal in de route, voorkomt URL-misbruik (`?limit=999999`).
- `loading.tsx` + `error.tsx` per route, zelfde patroon als roadmap.

### 6. Roadmap-CTA

- Update `apps/portal/src/app/(app)/projects/[id]/roadmap/page.tsx`:
  - Onder de `<BucketStack>`: link `Bekijk volledige changelog →` naar `/projects/${id}/changelog`
  - Subtiele tekst-link, geen prominente knop (niet de hoofd-CTA — rapporten blijven dat).

### 7. Mobile-shell integratie

- Voeg changelog toe aan de portal-mobile-drawer (`apps/portal/src/components/layout/...`) zodat klant er ook via menu kan komen.
- Label: `Changelog`. Icon: `ListChecks` of `History` (Lucide).

### 8. Tests

- Query-test: `listDoneTopicsForChangelog` retourneert juiste volgorde, juiste `hasMore` (limit+1-trick), respecteert `wont_do`-uitsluiting.
- Helper-test: `groupTopicsByWeek` met topics op week-grens (zondag → maandag), schrikkeljaar, lege input.
- RLS-test (integration): klant van project A → `/projects/{B}/changelog` → 404 of leeg.
- Smoke: roadmap-CTA klikbaar, navigeert naar changelog.

## Acceptatiecriteria

- [ ] PR-REQ-180: window-constante = 7 dagen, oude tests/asserts up-to-date
- [ ] PR-REQ-181/182/183: changelog rendert per week, juiste sortering
- [ ] PR-REQ-184/185: 20 initieel, `?limit=40` cumulatief, knop verdwijnt aan einde
- [ ] PR-REQ-186: row toont titel, type-pill, signals (indien >0), datum mono
- [ ] PR-REQ-187: empty state bij projecten zonder done-topics
- [ ] PR-REQ-188: CTA op roadmap-pagina zichtbaar en werkend
- [ ] PR-REQ-189: topic gefixt 3 dagen geleden zichtbaar op zowel roadmap-bucket `recent_done` als changelog
- [ ] PR-REQ-190: RLS-test slaagt
- [ ] PR-REQ-191: `wont_do` topics niet zichtbaar op changelog
- [ ] PR-REQ-192: sticky week-headers werken op iOS Safari + Android Chrome
- [ ] Type-check + lint slagen
- [ ] `npm run check:queries` slaagt (geen directe `.from()` in route)

## Risico's

| Risico                                                                                   | Mitigatie                                                                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `?limit=` URL-parameter wordt misbruikt (bv. `?limit=99999`)                             | Lokale `clampLimit(min=20, max=200)` in de route                                                                       |
| Topic met `closed_at = null` maar status `done` (data-inconsistent)                      | Query filtert `closed_at IS NOT NULL`; voor zichtbaarheid op roadmap blijft `topicStatusToBucket` retourneren `null`   |
| Performance bij projecten met 500+ done-topics                                           | Limit-based pagination + DB-index op `(project_id, status, closed_at DESC)` — check of die index bestaat, anders maken |
| Sticky headers gestapeld (week-headers vs portal-app-bar)                                | `top: var(--portal-header-height)` ipv `top-0`; visueel testen op mobile                                               |
| Window-versmalling laat de roadmap-bucket leeg lijken voor klanten met weinig activiteit | CTA "Bekijk volledige changelog" is altijd zichtbaar zodat klant context houdt                                         |

## Bronverwijzingen

- Sessie-discussie 2026-04-30 (deze sprint geboren uit pagina-lengte zorg)
- Bestaand: `packages/database/src/constants/topics.ts` (window-constante)
- Bestaand: `packages/database/src/queries/topics/list.ts:161` (`listTopicsByBucket`)
- Bestaand: `apps/portal/src/app/(app)/projects/[id]/roadmap/page.tsx` (CTA-locatie)
- Patroon: `sprints/backlog/PR-013-portal-reports-archive-and-detail.md` (archief-pagina precedent)

## Vision-alignment

Vision §2.3 — Portal als "always-on transparency" voor klant. Een groeiende
roadmap die nooit kort wordt verbreekt het signaal "wat speelt er nu". De
changelog scheidt **status** (roadmap, kort en actueel) van **historie**
(changelog, doorzoekbaar bewijs van progressie). Beide versterken het
vertrouwen, op verschillende manieren.

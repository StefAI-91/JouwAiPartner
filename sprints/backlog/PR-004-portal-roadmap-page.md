# Micro Sprint PR-004: Portal Roadmap-page (4 buckets, read-only)

## Doel

In de Portal een nieuwe roadmap-pagina opleveren naast de bestaande `/issues`-route: vier buckets (Recent gefixt / Komende week / Hoge prio daarna / Niet geprioritiseerd) op topic-niveau, read-only, geen klant-interactie. Klanten zien hier voor het eerst hun werkstroom samengevat in klant-taal in plaats van issue-tickets. Geen signaal-knoppen (komt in PR-006), geen afgewezen-wensen-paneel (PR-009/PR-010).

## Requirements

| ID            | Beschrijving                                                                                                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-REQ-040    | Route `apps/portal/src/app/(app)/projects/[id]/roadmap/page.tsx` bestaat naast `/issues`                                                                                                              |
| PR-REQ-041    | Pagina toont 4 buckets met conditional logic uit §4.4: `done<14d` / `in_progress+scheduled` / `prioritized` / `awaiting_client_input`                                                                 |
| PR-REQ-042    | Topics in `clustering`, `wont_do`, `wont_do_proposed_by_client` zijn níét zichtbaar                                                                                                                   |
| PR-REQ-043    | Topic-card toont: client_title (fallback title), client_description (1-2 zinnen), type-badge, priority-badge (als gevuld), # linked issues, sprint-label (alleen "Komende week"), updated_at relatief |
| PR-REQ-044    | Per bucket een telling                                                                                                                                                                                |
| PR-REQ-045    | Topic-detail-pagina `/projects/[id]/roadmap/[topicId]/page.tsx` toont title, client_description (markdown), status, priority, type, linked issues lijst, updated_at, geen knoppen                     |
| PR-REQ-046    | RLS-test: klant van CAI ziet alleen CAI-topics; klant van andere org ziet 404 op CAI-topic-detail                                                                                                     |
| PR-REQ-047    | `loading.tsx` en `error.tsx` per route                                                                                                                                                                |
| PR-REQ-048    | Mobiele weergave (375px) leesbaar zonder horizontaal scrollen — vier kolommen → verticaal stack                                                                                                       |
| PR-DESIGN-004 | Visuele identiteit volgt §14: editorial typografie (Newsreader display, Geist body, Geist Mono data), bucket-hues, hairline borders                                                                   |
| PR-DESIGN-005 | Geen iconen op topic-cards — typografische badges volstaan (§14.9)                                                                                                                                    |
| PR-DESIGN-006 | Bucket-counters in mono met tabular-numerals (`.num-tabular`); padding-keuze "03" vs "3" — zie open vraag in §14.10 punt 4                                                                            |

## Afhankelijkheden

- **PR-001** (database) — schema, RLS, types
- **PR-002** (queries) — `listTopicsByBucket`, `getTopicById`, `getTopicWithIssues`, `countIssuesPerTopic`
- **PR-003** (DevHub feature) — om topics te kunnen aanmaken voor demo-content; technisch geen blocker, maar zonder is de pagina leeg
- **PR-000** (mobile drawer) — aanbevolen vóór go-live: zonder drawer is mobile Portal niet bruikbaar

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- §14.10 punt 1 — fonts in productie of niet? Aanbeveling: hergebruik Newsreader/Geist via `next/font/google`, scope op roadmap-route
- §14.10 punt 4 — bucket-counters padded ("03") of niet ("3")? Beslissen vóór PR-merge; aanbeveling: padded want editorial-toon

## Visuele referentie

- Live preview: `/design-preview/roadmap` (volledig roadmap-board met mock-data) — sectie "01" t/m "04" buckets
- Design-spec: [`docs/specs/prd-portal-roadmap/14-design-keuzes.md`](../../docs/specs/prd-portal-roadmap/14-design-keuzes.md):
  - §14.1 Aesthetic
  - §14.2 Typografie
  - §14.3 Kleurpalet (bucket-hues sage/amber/slate-blue/rose)
  - §14.4 Component-systeem (cards, badges)
  - §14.5 Layout-principes (whitespace, asymmetric grids)

## Migreren vanuit preview

| Preview-bestand                                                 | Productie-doel                                          | Wat doen                                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `apps/portal/src/components/roadmap-preview/mock-data.ts`       | _(schrappen)_                                           | Vervang door echte queries uit `@repo/database/queries/topics`                               |
| `apps/portal/src/components/roadmap-preview/roadmap-board.tsx`  | `apps/portal/src/components/roadmap/roadmap-board.tsx`  | Migreren as-is; vervang mock met server-data via props                                       |
| `apps/portal/src/components/roadmap-preview/topic-card.tsx`     | `apps/portal/src/components/roadmap/topic-card.tsx`     | Migreren as-is; props-interface aansluiten op `PortalTopic`-row                              |
| `apps/portal/src/components/roadmap-preview/topic-detail.tsx`   | `apps/portal/src/components/roadmap/topic-detail.tsx`   | Migreren; voeg server-side data fetching toe; verwijder signal-buttons (komt in PR-006)      |
| `apps/portal/src/components/roadmap-preview/badges.tsx`         | `apps/portal/src/components/roadmap/badges.tsx`         | Beoordelen per badge: deel naar `@repo/ui` als breed herbruikbaar; rest blijft in `roadmap/` |
| `apps/portal/src/components/roadmap-preview/section-header.tsx` | `apps/portal/src/components/roadmap/section-header.tsx` | Migreren                                                                                     |

> Editorial design-tokens in `globals.css` onder `/* --- Design Preview: Editorial scope --- */`: bij migratie verplaatsen naar Portal-top-level scope of houden onder `.editorial`-class. Beslissen vóór PR-merge (§14.8 footer).

## Taken

### 1. Compositiepagina opzetten

- Maak `apps/portal/src/components/roadmap/`:

  ```
  apps/portal/src/components/roadmap/
  ├── roadmap-board.tsx       # 4-bucket layout
  ├── topic-card.tsx          # read-only card
  ├── topic-detail-view.tsx
  ├── badges.tsx              # type-badge, priority-badge, status-pill, count-badge
  ├── section-header.tsx      # bucket-header met label + count
  └── empty-states.tsx        # per-bucket lege-state
  ```

- Compositiepagina (geen `features/[naam]/`) — Portal heeft geen eigen mutaties, alleen view (CLAUDE.md feature-structuur regel)

### 2. Routes

- `apps/portal/src/app/(app)/projects/[id]/roadmap/page.tsx`:
  - Server Component
  - Vraag `currentSprintId` op uit project-context (als sprint-tabel niet bestaat: `null` doorgeven)
  - `const buckets = await listTopicsByBucket(id, currentSprintId);`
  - Render `<RoadmapBoard buckets={buckets} projectId={id} />`
- `apps/portal/src/app/(app)/projects/[id]/roadmap/[topicId]/page.tsx`:
  - Server Component
  - `const topic = await getTopicWithIssues(topicId);`
  - `if (!topic) notFound();`
  - Verifieer ook expliciet dat `topic.project_id === id` (defensieve scope-check naast RLS)
  - Render `<TopicDetailView topic={topic} />`
- `loading.tsx` per route met skeleton (4 kolommen, 3 cards per kolom)
- `error.tsx` per route

### 3. Components

- `roadmap-board.tsx`:
  - Server Component (geen state)
  - Props: `buckets: { recent_done: TopicRow[]; upcoming: TopicRow[]; high_prio: TopicRow[]; awaiting_input: TopicRow[] }`, `projectId: string`
  - Layout: `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6`
  - Per bucket: `<SectionHeader>` + bucket-hue background-tint + lijst van `<TopicCard>`s of `<EmptyState>`
  - Mobiel: stack verticaal (md breakpoint)

- `topic-card.tsx`:
  - Server Component, Link wrapper naar `/projects/[id]/roadmap/[topicId]`
  - Toont: heading (`client_title ?? title`), 1-2 zin description (`client_description ?? description`, truncate), badges-rij, sprint-label (alleen voor "Komende week"-bucket), updated_at relatief
  - Hairline border 1px, hover: bg `--paper-elevated` → white (geen lift)

- `topic-detail-view.tsx`:
  - Server Component
  - Layout: heading + meta-rij + `<ReactMarkdown>` voor `client_description` + linked issues lijst (titel + datum, geen status-badge — Portal toont topic-niveau, niet issue-niveau)
  - Geen knoppen (read-only fase 1)

- `badges.tsx`:
  - Type-badge: `● Bug` of `● Feature` in mono uppercase
  - Priority-badge: `P0` rood, `P1` oranje, `P2/P3` grijs (in mono, geen pill)
  - Status-pill: `● Komende week` met dot in bucket-hue
  - Count-badge: `● 03 onderwerpen` in mono

- `section-header.tsx`:
  - Romeinse cijfers (I, II, III, IV) NIET hier — alleen in rapport-detail (PR-013). Voor roadmap-buckets: simpele label + telling.
  - Format: `<h2>Recent gefixt <span class="num-tabular">03</span></h2>`

- `empty-states.tsx`:
  - Per bucket subtiele zin: "Nog geen recent opgeleverde onderwerpen" / "Geen onderwerpen voor deze week" / etc.

### 4. Navigatie

- Voeg "Roadmap"-link toe aan project-subnav (sidebar) in Portal — naast bestaande "Issues"-link
- Update `apps/portal/src/components/layout/app-sidebar-client.tsx` of de gedeelde `sidebar-content.tsx` (uit PR-000)

### 5. Editorial typografie scoping

- Maak een wrapper-class `.editorial` in `apps/portal/src/app/globals.css` die Newsreader/Geist activeert (zoals nu in design-preview)
- Pas die class toe op de roadmap-route via een layout-niveau wrapper, zonder de bestaande `/issues`-route te raken
- **Alternatief**: als open vraag §14.10 punt 1 leidt tot "fonts globaal in Portal", verplaats naar `app/(app)/layout.tsx`. Beslissen vóór PR.

### 6. RLS-tests

- Schrijf integration-test die met een testaccount van een andere org probeert:
  - `/projects/<CAI-id>/roadmap` → krijgt geen data (lege buckets) of 404 op project-niveau
  - `/projects/<CAI-id>/roadmap/<topic-id>` → 404 via `notFound()`

## Acceptatiecriteria

- [ ] PR-REQ-040: route bestaat en is bereikbaar
- [ ] PR-REQ-041: 4 buckets met juiste topics op basis van status/closed_at
- [ ] PR-REQ-042: topics in clustering/wont_do/wont_do_proposed niet zichtbaar
- [ ] PR-REQ-043: topic-card toont alle vereiste velden, sprint-label alleen in "Komende week"
- [ ] PR-REQ-044: bucket-counters tonen correct aantal
- [ ] PR-REQ-045: detail-pagina toont alle vereiste velden, geen knoppen
- [ ] PR-REQ-046: RLS-test voor andere klant slaagt
- [ ] PR-REQ-047: loading + error states aanwezig
- [ ] PR-REQ-048: viewport 375px geen horizontaal scrollen
- [ ] PR-DESIGN-004 t/m PR-DESIGN-006: visuele check tegen `/design-preview/roadmap`
- [ ] Type-check + lint + `npm run check:queries` slagen
- [ ] Vitest: tests voor `RoadmapBoard` (rendert 4 secties, lege-state per bucket)
- [ ] Geen regressie op bestaande `/issues`-route

## Risico's

| Risico                                                                  | Mitigatie                                                                                  |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `currentSprintId` is niet bekend → "Komende week" toont niets of teveel | In v1: filter `status IN ('in_progress','scheduled')` zonder sprint-check (alle scheduled) |
| Editorial fonts blazen bundle-size op                                   | Lighthouse-meting met en zonder; beslissen of we naar één family gaan                      |
| Markdown rendering kwetsbaar voor injectie                              | Hergebruik bestaande `react-markdown` + `remark-gfm` config uit Portal-issue-detail        |
| Drie aparte queries voor counts/list/detail = round-trips               | `listTopicsByBucket` levert al alles inclusief tellingen; geen separate count-query nodig  |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/06-fase-1-basis.md` §6.3.3, §6.3.4, §6.3.5 (Portal UI), §6.7 (acceptatie)
- PRD: `docs/specs/prd-portal-roadmap/04-conceptueel-model.md` §4.4 (bucket-mapping)
- PRD: `docs/specs/prd-portal-roadmap/14-design-keuzes.md` (volledig)
- Bestaand: `apps/portal/src/app/(app)/projects/[id]/issues/page.tsx` (referentie voor route-structuur)
- Preview: `apps/portal/src/components/roadmap-preview/` (alle bestanden)

## Vision-alignment

Past direct in vision §2.4 (Portal als trust layer): klanten zien hun werkstroom in klant-taal en krijgen verficatie dat het JAIP-team aan hun problemen werkt. Topic-niveau ipv issue-niveau is dé manier waarop volume schaalbaar wordt.

# Micro Sprint CP-010: Portal Briefing-page v2 (action-oriented redesign)

## Doel

De huidige Portal-projectpagina (`/projects/[id]`) vervangen door een actiegerichte
Briefing met vier nieuwe blokken: deploy-links + screenshot, "Klaar om te testen"
(topics met test-instructies), "Waar wachten we op" (topics met `awaiting_client_input`),
"Deze week gebeurd" (changelog van afgesloten topics + meetings) en een subtiele
issue-counts footer. Vervangt de passive overview met de huidige `IssueMetrics` /
`ProjectSummary` / `RecentActivity` blokken.

Mockup-referentie: [`docs/mockups/portal-briefing-v2.html`](../../docs/mockups/portal-briefing-v2.html).

## Requirements

| ID            | Beschrijving                                                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| CP-REQ-100    | Project-tabel krijgt drie nullable text-velden: `preview_url`, `production_url`, `screenshot_url`                                             |
| CP-REQ-101    | Topics-tabel krijgt een nullable text-veld `client_test_instructions` (markdown)                                                              |
| CP-REQ-102    | Cockpit project-edit-form heeft input-velden voor de drie deploy-velden + screenshot URL                                                      |
| CP-REQ-103    | DevHub topic-detail (`apps/devhub/src/features/topics/components/topic-detail.tsx`) heeft een markdown-editor voor `client_test_instructions` |
| CP-REQ-104    | Portal Briefing-page header toont projectnaam, organisatie, status-pill, en (indien gevuld) twee deploy-knoppen + screenshot-frame            |
| CP-REQ-105    | "Klaar om te testen" toont topics met `status='in_progress'` die `client_test_instructions` hebben — uitklap-bare instructies per topic       |
| CP-REQ-106    | "Waar wachten we op" toont topics met `status='awaiting_client_input'` met "open sinds X dagen" + CTA-knop naar topic-detail                  |
| CP-REQ-107    | "Deze week gebeurd" toont 4-8 events: topics afgesloten in afgelopen 7 dagen + meetings in afgelopen 7 dagen, gesorteerd op datum desc        |
| CP-REQ-108    | Issue-counts (bestaande `getProjectIssueCounts`) tonen onderaan als één compacte regel, niet als hoofdcontent                                 |
| CP-REQ-109    | Empty-states per blok: geen testbare topics → blok verbergen of subtiele lege-state; geen blockers → "Geen extra blockers — we kunnen door"   |
| CP-REQ-110    | Mobiele weergave (375px): twee-koloms grid stackt verticaal; deploy-knoppen blijven inline-flex; screenshot full-width                        |
| CP-REQ-111    | RLS-test: client van project A ziet 404 bij `/projects/<B>/...` (defensieve check naast bestaande RLS)                                        |
| CP-REQ-112    | Bestaande components verwijderen wanneer ze niet meer gebruikt worden: `IssueMetrics`, `ProjectSummary`, `RecentActivity`                     |
| CP-DESIGN-100 | Visueel volgt mockup: light theme, hairline borders, soft shadows, geen gradient cards, editorial bullet-feed voor changelog                  |
| CP-DESIGN-101 | Deploy-knoppen: preview als secondary (border + white bg), productie als primary (donker met groene live-dot)                                 |
| CP-DESIGN-102 | "Waar wachten we op" gebruikt amber tint (`amber-50/200`), geen luide rood/oranje                                                             |

## Afhankelijkheden

- **PR-001 / PR-002 / PR-003** (topics foundation) — bestaat al, is voorwaarde voor `client_test_instructions` veld
- **CP-005** (Portal MVP) — bestaande projectpagina is uitgangspunt
- **DH-020** (admin-team UI) — referentie voor DevHub form-patroon

### Open vragen vóór start

1. **Screenshot bron**: handmatige URL-input is voldoende voor v1 (gebruiker bevestigt) — geen integratie met urlbox/screenshotone. Akkoord vastleggen.
2. **Changelog scope v1**: alleen `topics.closed_at` + `meetings.created_at` (laatste 7 dagen), of ook andere events (issue-status-veranderingen, comments)? Aanbeveling: start met topics + meetings; uitbreiden in vervolg-sprint.
3. **`client_test_instructions` invuldiscipline**: wie vult dit wanneer in? Zonder discipline blijft "Klaar om te testen" leeg. Aanbeveling: DevHub topic-detail prompt "Klant kan dit testen" vóór status-overgang naar `in_progress`.

## Visuele referentie

- Mockup: [`docs/mockups/portal-briefing-v2.html`](../../docs/mockups/portal-briefing-v2.html)
- Bestaande Portal-styling: shadcn/ui base-nova, light theme, Tailwind v4 met `@theme` tokens in `apps/portal/src/app/globals.css`

## Taken

### 1. Database-migratie

Eén SQL-file in `supabase/migrations/`:

```sql
-- projects: deploy URLs + screenshot
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS preview_url    text,
  ADD COLUMN IF NOT EXISTS production_url text,
  ADD COLUMN IF NOT EXISTS screenshot_url text;

-- topics: instructies voor de klant om de feature te testen
ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS client_test_instructions text;
```

Geen RLS-wijzigingen — bestaande policies dekken de nieuwe kolommen.

Daarna:

- `npm run gen:types` (regenereer `packages/database/src/types/database.ts`)

### 2. Queries

In `packages/database/src/queries/portal/`:

- **`briefing.ts`** (nieuw bestand) met:
  - `getProjectBriefingHeader(projectId, client)` — name, status, organization, preview_url, production_url, screenshot_url
  - `listTopicsReadyToTest(projectId, client)` — topics waar `status='in_progress'` AND `client_test_instructions IS NOT NULL`
  - `listTopicsAwaitingInput(projectId, client)` — topics waar `status='awaiting_client_input'`, met `updated_at` voor "open sinds X dagen"
  - `listWeeklyChangelog(projectId, client, days = 7)` — UNION van afgesloten topics + meetings in venster, max 8 entries

> Cluster of flat? `briefing.ts` past in flat (één coherent sub-domein, <200 regels verwacht). Splitsen in submap is niet nodig.

In `packages/database/src/queries/topics/` bestaat al voldoende — geen aanpassing.

### 3. Mutations + validations

- `packages/database/src/mutations/projects.ts` — uitbreiden met `updateProjectDeployFields` (preview_url, production_url, screenshot_url) of generieke `updateProject` als die al bestaat (controleren).
- `packages/database/src/mutations/topics.ts` — `updateTopicTestInstructions(topicId, instructions, client)` toevoegen, of generieke topic-update gebruiken.
- `packages/database/src/validations/projects.ts` — Zod schema uitbreiden met optionele URL-velden (`z.string().url().optional().nullable()`)
- `packages/database/src/validations/topics.ts` — schema uitbreiden met `clientTestInstructions: z.string().optional().nullable()`

### 4. DevHub UI: velden bewerkbaar

- **Project-edit form** (cockpit, niet devhub — projectbeheer zit in cockpit): voeg drie URL-inputs toe aan het bestaande project-edit form. Locatie controleren: `apps/cockpit/src/features/projects/components/`.
- **Topic-detail** (`apps/devhub/src/features/topics/components/topic-detail.tsx`): voeg een `client_test_instructions` markdown-editor toe (textarea met monospace + simpele preview-toggle volstaat). Plaats hem prominent — dit is wat de klant gaat zien.
- Server action voor topic test-instructions in `apps/devhub/src/features/topics/actions/topics.ts`.

### 5. Portal compositiepagina rebuild

Compositiepagina (geen `features/`) — Portal heeft geen mutaties, alleen view (CLAUDE.md feature-structuur regel).

```
apps/portal/src/components/briefing/
├── project-header.tsx          # naam, org, status-pill, deploy-knoppen, screenshot-frame
├── ready-to-test-list.tsx      # topics met instructies, uitklap-bare panels
├── ready-to-test-card.tsx      # individuele topic-card met instructies (client component voor toggle)
├── awaiting-input-list.tsx     # topics met awaiting_client_input + CTA's
├── weekly-changelog.tsx        # bullet-feed met datum-stripes en auteur
└── status-footer.tsx           # subtiele issue-counts + link naar roadmap
```

Page (`apps/portal/src/app/(app)/projects/[id]/page.tsx`):

```ts
const [header, ready, waiting, changelog, counts] = await Promise.all([
  getProjectBriefingHeader(id, supabase),
  listTopicsReadyToTest(id, supabase),
  listTopicsAwaitingInput(id, supabase),
  listWeeklyChangelog(id, supabase),
  getProjectIssueCounts(id, supabase),
]);
```

Render alle vijf de blokken in volgorde uit de mockup. Empty-states per blok afhandelen.

`loading.tsx` en `error.tsx` aanwezig laten/aanpassen.

### 6. Cleanup

Verwijder bestanden die niet meer gebruikt worden na rebuild:

- `apps/portal/src/components/projects/issue-metrics.tsx`
- `apps/portal/src/components/projects/project-summary.tsx`
- `apps/portal/src/components/projects/recent-activity.tsx`

(per CLAUDE.md "Orphans opruimen mag wél" — verwijder alleen wat door deze sprint
unused wordt, niet andere pre-existing dead code)

Check via grep dat geen andere routes deze components nog gebruiken.

### 7. Tests

- **`packages/database/__tests__/queries/portal/briefing.test.ts`** — payload-capture tests voor de vier nieuwe queries (mock Supabase boundary)
- **`apps/portal/__tests__/components/briefing/ready-to-test-card.test.tsx`** — toggle-gedrag (client component), instructies tonen/verbergen
- **`apps/portal/__tests__/components/briefing/awaiting-input-list.test.tsx`** — "open sinds X dagen" formattering correct, CTA-link
- **RLS-integration** (in `packages/database/__tests__/projects-rls.test.ts` of nieuw): client van andere org → geen briefing-data
- **Topic-detail action**: Zod-validatie + server-action update flow voor `client_test_instructions`

## Acceptatiecriteria

- [ ] CP-REQ-100: migratie toegevoegd, kolommen bestaan, types gegenereerd
- [ ] CP-REQ-101: `topics.client_test_instructions` bestaat
- [ ] CP-REQ-102: cockpit project-form heeft 3 URL-velden, save werkt
- [ ] CP-REQ-103: devhub topic-detail toont test-instructies-editor, save werkt
- [ ] CP-REQ-104 t/m 108: Portal Briefing rendert alle vijf blokken correct met realistische data
- [ ] CP-REQ-109: empty-states per blok werken, geen lege kale rechthoeken
- [ ] CP-REQ-110: viewport 375px geen horizontaal scrollen, alle blokken stacken correct
- [ ] CP-REQ-111: RLS-test slaagt voor cross-org check
- [ ] CP-REQ-112: drie oude components verwijderd, geen broken imports
- [ ] CP-DESIGN-100 t/m 102: visuele check tegen `docs/mockups/portal-briefing-v2.html`
- [ ] Type-check + lint + `npm run check:queries` slagen
- [ ] Vitest: nieuwe tests groen, bestaande Portal-tests blijven groen
- [ ] Visueel verified op staging tegen een echt project met gevulde + lege velden

## Risico's

| Risico                                                                           | Mitigatie                                                                                                                                      |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope is breed (DB + 2 apps + tests) — past niet in één sprint                   | Splitsbaar in CP-010a (DB + DevHub-velden) en CP-010b (Portal-rebuild). Volgorde verplicht: a vóór b.                                          |
| `client_test_instructions` blijft leeg → "Klaar om te testen" altijd onzichtbaar | Sprint sluit af met dogfood: vul instructies voor 2-3 topics op een echt project; valideer dat blok verschijnt op staging                      |
| Changelog query (UNION topics + meetings) wordt ingewikkeld                      | Start met twee aparte queries + merge in JS (max 8 entries totaal); refactor naar single query pas als perf-issue blijkt                       |
| Screenshot URL kan een externe asset zijn (CSP / cross-origin)                   | `<img>` met `loading="lazy"`, geen iframe; CSP-policy van Portal toelaten voor https-images. Of gebruik Supabase Storage upload als simpler    |
| Old components verwijderen breekt iets onbekends                                 | Pre-flight: `grep` voor imports vóór delete; dry-run via `git stash`                                                                           |
| `awaiting_client_input` is geen status in fase 1 (zie PR-003)                    | Bestaat wel in DB-CHECK (`topics_status_check`), maar UI laat hem niet zetten — DevHub topic-status-select moet hem ook tonen (klein addendum) |

## Bronverwijzingen

- Mockup: [`docs/mockups/portal-briefing-v2.html`](../../docs/mockups/portal-briefing-v2.html)
- Bestaande page: `apps/portal/src/app/(app)/projects/[id]/page.tsx`
- Bestaande queries: `packages/database/src/queries/portal/core.ts`
- Topics feature: `apps/devhub/src/features/topics/README.md`
- Topics DB: `supabase/migrations/20260428100000_topics.sql`
- Portal-conventies: `apps/portal/src/components/roadmap/` (compositiepagina-patroon volgens CLAUDE.md)

## Vision-alignment

Past in vision §2.4 (Portal als trust layer) en §3.4 (verification before truth):
de klant ziet niet langer een passief dashboard met issue-tellingen, maar een
actief verhaal — wat is klaar om te testen, waar wordt op hem gewacht, wat is
er gebeurd. De `client_test_instructions` zijn een dwingende vorm van human-
verified content: zonder dat een teamlid bewust schrijft hoe iets te testen,
verschijnt de feature niet op de klantpagina. Dat past bij de "verification
gate"-filosofie van het hele platform.

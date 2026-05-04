# Micro Sprint CP-012: Project-sprints en portal-communicatie

## Doel

Geef het team een eerstvolgende manier om per klantproject **sprints** vast
te leggen (variabel aantal, één per opleverweek) en die zichtbaar te maken
in de klant-portal — zowel als banner op de Briefing als tijdlijn op de
Roadmap. Onderscheid scherp tussen **dev-modus** (sprint-communicatie
domineert) en **productie-modus** (productie-feedback domineert).

## Achtergrond

Vandaag heeft de portal twee kanalen voor klant-communicatie:

- **Briefing** (`/projects/[id]`) — toont topics met `client_test_instructions`
  in de "Klaar om te testen"-sectie
- **Roadmap** (`/projects/[id]/roadmap`) — 4 buckets gebaseerd op topic-status

Beide kanalen behandelen sprint-werk (geplande nieuwbouw) en
productie-feedback (bugs/feature-requests uit live app) als één stroom.
Voor projecten die nog **in ontwikkeling** zijn (`projects.status` ∈
`kickoff/in_progress/review`) is dat verwarrend: de klant ziet een
"roadmap" met buckets die niets zeggen over wanneer Sprint 2 wordt
opgeleverd.

PRD `prd-portal-roadmap §13.3` open vraag I-5 noemde dit gat al:
_"check of er al een sprints-tabel is. Zo niet: text-veld in v1,
migreren als sprints formele entiteit worden."_ `topics.target_sprint_id`
bestaat als text-veld (zie migratie `20260428100000_topics.sql:29`) maar
is bewust niet als FK gemodelleerd omdat sprints toen geen entiteit
waren. Deze sprint promoveert sprints tot eerste-klasse entiteit.

## Scope

In scope:

- Database: tabel `sprints` + kolom `topics.origin` + FK-migratie van
  `topics.target_sprint_id`
- Cockpit: sprints-management op project-detailpagina (alleen zichtbaar
  in dev-fase)
- Portal Briefing: sprint-banner bovenaan in dev-modus
- Portal Roadmap: status-driven mode-switch (dev = sprint-tijdlijn,
  productie = bestaande buckets gefilterd op `origin='production'`)

Buiten scope (volgende sprints):

- Auto-generate sprint-status uit gekoppelde topics (handmatig in v1)
- Sprint-templates of bulk-aanmaak
- Klant-zicht op sprint-historie nadat project naar productie ging
  (per beslissing in design-discussie: historie verdwijnt, klant ziet
  vanaf dat moment alleen `origin='production'`-topics)
- E-mail/Slack-notificatie bij sprint-status-wijziging

## Requirements

| ID         | Beschrijving                                                                                                                                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CP-REQ-130 | Tabel `sprints`: `id` uuid PK, `project_id` uuid FK CASCADE, `name` text, `delivery_week` date (maandag), `summary` text NULL, `status` text CHECK IN ('planned','in_progress','delivered'), `order_index` int, `created_at`, `updated_at`      |
| CP-REQ-131 | Index `(project_id, order_index)` voor weergave-volgorde; index `(project_id, status)` voor "huidige sprint"-lookup                                                                                                                             |
| CP-REQ-132 | RLS: portal-clients SELECT via `has_portal_access(project_id)`; cockpit-team admin via service-role (geen RLS-bypass nodig in cockpit-actions, gebruik authenticated user check in actions)                                                     |
| CP-REQ-133 | `topics.target_sprint_id` migreert van `text` naar `uuid` FK → `sprints(id)` ON DELETE SET NULL. Bestaande text-waardes (indien aanwezig) gaan naar `null` met log-notice in migratie                                                           |
| CP-REQ-134 | Kolom `topics.origin` text NOT NULL DEFAULT `'production'` CHECK IN ('sprint','production'). Backfill: bestaande topics met niet-null `target_sprint_id` (na FK-migratie) krijgen `'sprint'`                                                    |
| CP-REQ-135 | `packages/database/src/queries/sprints/` cluster met `list.ts` (`listSprintsByProject`, `getCurrentSprint`) en `detail.ts` (`getSprintById` met linked topics)                                                                                  |
| CP-REQ-136 | `packages/database/src/mutations/sprints/` met `crud.ts` (`createSprint`, `updateSprint`, `deleteSprint`, `reorderSprints`)                                                                                                                     |
| CP-REQ-137 | Zod-schemas in `packages/database/src/validations/sprints.ts` voor create/update; `name` 1–80 chars, `summary` ≤ 500 chars, `delivery_week` moet maandag zijn                                                                                   |
| CP-REQ-138 | Cockpit: nieuwe feature-folder `apps/cockpit/src/features/sprints/` met `actions/sprints.ts`, `components/sprint-list.tsx`, `components/sprint-row-editor.tsx`, `components/add-sprint-button.tsx`, `validations/`, `README.md`                 |
| CP-REQ-139 | Cockpit project-pagina (`apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`) krijgt `<ProjectSprintsCard>` tussen `ProjectSummaryCard` en `ProjectTimeline` — alleen renderen als `project.status` ∈ `['kickoff','in_progress','review']` |
| CP-REQ-140 | Sprint-row-editor: inline-edit voor `name`, `delivery_week` (week-picker, snap naar maandag), `summary` (textarea), `status` (select). Save via Server Action met optimistic UI                                                                 |
| CP-REQ-141 | Add-sprint-button: maakt nieuwe sprint met default name `"Sprint N+1"` (op basis van bestaand max order_index), `delivery_week` = volgende maandag na laatste sprint of vandaag                                                                 |
| CP-REQ-142 | Drag-handle voor herordening (optioneel — als out-of-scope voor v1, dan order_index aanpassen via `↑`/`↓` knoppen). v1: `↑/↓` knoppen, geen drag                                                                                                |
| CP-REQ-143 | DevHub topic-form (`apps/devhub/src/features/topics/components/topic-form.tsx`): `target_sprint_id` wordt een select-field met sprints van het topic's project (i.p.v. text input)                                                              |
| CP-REQ-144 | Portal Briefing: `<SprintBanner>`-component bovenaan de pagina als `project.status` ∈ dev-fase EN `getCurrentSprint(projectId)` ≠ null. Toont: naam, "oplevering week van [datum]", summary                                                     |
| CP-REQ-145 | Portal Briefing in dev-modus: `<ReadyToTestList>` filtert topics op `origin='sprint'`; in productie-modus: filtert op `origin='production'`                                                                                                     |
| CP-REQ-146 | Portal Roadmap (`/projects/[id]/roadmap`): switch op `project.status`. Dev-fase rendert `<SprintTimeline>` (alle sprints van project, chronologisch), productie-fase rendert bestaande `<BucketStack>` (gefilterd op `origin='production'`)     |
| CP-REQ-147 | `<SprintTimeline>`: lijst van sprints met visuele status (verleden = check-icon + grijs, in_progress = highlighted, planned = neutraal). Per sprint: naam, opleverweek, summary, lijst gekoppelde topics (`client_title` of `title`)            |
| CP-REQ-148 | `<BucketStack>` query (`listTopicsByBucket`) krijgt extra filter `origin='production'` zodat sprint-topics nooit in productie-modus opduiken                                                                                                    |
| CP-REQ-149 | Type-regeneratie: `npm run types:generate` na alle migraties                                                                                                                                                                                    |
| CP-REQ-150 | Update `packages/database/src/queries/topics/README.md` (en relevante feature READMEs) met de origin-split en sprint-FK                                                                                                                         |

## Open vragen vóór start

1. **Week-granulariteit vs exacte datum?** Spec hierboven gebruikt `date`
   met constraint "moet maandag zijn". Alternatief: aparte kolommen
   `year` (int) + `week_number` (int). Aanbeveling: `date` met maandag-check
   — past beter bij Postgres-tooling en is direct sorteerbaar. Bevestigen.

2. **Default `origin` voor bestaande topics zonder `target_sprint_id`?**
   Aanbeveling: `'production'` (veiligste default, geen valse claims dat
   het sprint-werk was). Bevestigen.

3. **Mag een sprint zonder gekoppelde topics bestaan?** Aanbeveling: ja —
   sprint kan vooraf gepland zijn voordat topics gemaakt zijn. Geen NOT
   NULL-koppeling.

4. **Wat als het team geen `in_progress` sprint heeft (alle planned of alle
   delivered)?** Briefing-banner verschijnt dan niet. Roadmap toont nog
   wel de tijdlijn. Akkoord, of moet er altijd "huidige" sprint zijn?

5. **Mag de klant `delivered`-status zien?** v1: ja, status is publiek per
   sprint in de tijdlijn. Geen aparte `is_visible_to_client`-flag in v1
   (gebruiker bevestigde "alles upfront zichtbaar").

## Afhankelijkheden

- Bestaande `projects.status` enum (`packages/database/src/constants/projects.ts`)
  — geen wijziging, alleen gebruik
- Bestaande `has_portal_access` RLS-helper (uit eerdere portal-sprints)
- DevHub topic-form: bestaande `updateTopicAction` flow

## Bouwvolgorde (CLAUDE.md: database → query → validatie → action → component → page)

1. Migratie 1: `sprints`-tabel + indexes + RLS
2. Migratie 2: `topics.target_sprint_id` text → uuid FK + `topics.origin` kolom + backfill
3. Type-regeneratie
4. `packages/database/src/queries/sprints/` cluster
5. `packages/database/src/mutations/sprints/` cluster
6. `packages/database/src/validations/sprints.ts`
7. Cockpit feature-folder `apps/cockpit/src/features/sprints/`
8. Cockpit project-pagina integratie (`ProjectSprintsCard` conditional)
9. DevHub topic-form aanpassing (text → select)
10. Portal `<SprintBanner>` op briefing
11. Portal `<SprintTimeline>` op roadmap + mode-switch
12. `<BucketStack>` filter `origin='production'`
13. Tests (drie lagen): validations → queries/mutations → components
14. README-updates + dependency-graph regenereren

## Definition of Done

- Migraties draaien clean op een lege DB en op een DB met bestaande topics
- `npm run check:queries`, `check:features`, `check:readmes` groen
- Vitest run groen — minimaal: zod-schemas, sprint-queries, mode-switch-logica op portal-pagina's
- Cockpit project-pagina toont sprints-card alleen in dev-fase
- Portal briefing en roadmap renderen correct in beide modi (handmatig getest)
- DevHub topic-form gebruikt sprint-select i.p.v. text-input
- Geen drift in `target_sprint_id`-naamgeving (overal FK, geen text meer)

# Micro Sprint PR-002: Topics Queries, Mutations & Validations

## Doel

Op de PR-001-foundation een complete data-API bouwen: queries voor list/detail/bucket-views, mutations voor CRUD en linking, en Zod-schemas voor validatie. Geen UI. Na deze sprint kunnen PR-003 (DevHub feature) en PR-004 (Portal compositiepagina) parallel hun UI bouwen op stabiele, getypeerde primitives.

## Requirements

| ID         | Beschrijving                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-REQ-010 | `listTopics(projectId, { type?, status? }, client?)` retourneert topics gefilterd; geen N+1 (count linked issues via subquery of join)            |
| PR-REQ-011 | `listTopicsByBucket(projectId, currentSprintId?, client?)` retourneert topics gegroepeerd per `PortalBucketKey`, alleen client-zichtbare statuses |
| PR-REQ-012 | `getTopicById(topicId, client?)` retourneert topic + linked issues (titel + status + datum, geen volledig issue-record)                           |
| PR-REQ-013 | `getTopicWithIssues` join: topic + N linked issues in één query (geen loop)                                                                       |
| PR-REQ-014 | `countIssuesPerTopic(topicIds, client?)` retourneert `Map<topicId, count>` voor card-rendering                                                    |
| PR-REQ-015 | `insertTopic(data, client?)` mutation; `created_by` afgeleid uit auth-context                                                                     |
| PR-REQ-016 | `updateTopic(id, data, client?)` mutation; valideert toegestane velden; raakt status NIET (aparte mutation)                                       |
| PR-REQ-017 | `deleteTopic(id, client?)` faalt met expliciete error als `linked_issues > 0`                                                                     |
| PR-REQ-018 | `updateTopicStatus(id, newStatus, client?)` mutation; in fase 1 zonder transitie-validatie (komt in PR-009/PR-010)                                |
| PR-REQ-019 | `linkIssueToTopic(topicId, issueId, client?)` mutation; faalt als issue al aan ander topic is gekoppeld                                           |
| PR-REQ-020 | `unlinkIssueFromTopic(topicId, issueId, client?)` mutation                                                                                        |
| PR-REQ-021 | Zod-schemas: `createTopicSchema`, `updateTopicSchema`, `linkIssueSchema`, `topicStatusSchema`                                                     |
| PR-REQ-022 | Geen directe `.from('topics')` of `.from('topic_issues')` in apps — alle DB-toegang via deze laag (`npm run check:queries` slaagt)                |

## Afhankelijkheden

- **PR-001** (database foundation) — tabellen, RLS, types, constants

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- Geen — alle benodigde keuzes zijn in PR-001 vastgelegd

## Taken

### 1. Queries cluster

- Maak `packages/database/src/queries/topics/`:

  ```
  packages/database/src/queries/topics/
  ├── index.ts              # re-exports
  ├── list.ts               # listTopics, listTopicsByBucket
  ├── detail.ts             # getTopicById, getTopicWithIssues
  ├── linked-issues.ts      # countIssuesPerTopic, getIssuesForTopic
  └── README.md             # cluster-rationale
  ```

- **Cluster-rationale** (zie CLAUDE.md): topics heeft eigen `features/topics/` in DevHub (criterium 3) — dus cluster met submap.

- `list.ts`:
  - `TOPIC_LIST_COLS = 'id, project_id, title, client_title, type, status, priority, target_sprint_id, closed_at, updated_at'`
  - `listTopics(projectId, filters?, client?)` — `.from('topics').select(TOPIC_LIST_COLS).eq('project_id', projectId)`, filter op `type`/`status` als gevuld
  - `listTopicsByBucket(projectId, currentSprintId?, client?)`:
    - Eén query met alle visible-status topics
    - In JS: groepeer per bucket via `topicStatusToBucket(status, closedAt)`
    - "Komende week" filter: `status IN ('in_progress','scheduled')` AND (`target_sprint_id IS NULL` OR `target_sprint_id IN (currentSprintId, nextSprintId)`)
    - **Note**: "next sprint" is in v1 niet computeerbaar zonder sprint-tabel — accepteer alleen `currentSprintId` en toon items met die sprint OF zonder sprint maar in_progress

- `detail.ts`:
  - `getTopicById(topicId, client?)` — basis-record
  - `getTopicWithIssues(topicId, client?)` — join via `topic_issues` + select op issues (`id, title, status, created_at`); gebruik PostgREST embed: `select('*, topic_issues(issue_id, issues(id,title,status,created_at))')`

- `linked-issues.ts`:
  - `countIssuesPerTopic(topicIds, client?)` — gebruik `count='exact'` in een PostgREST select met filter `topic_id IN (...)` of een rpc-call. Liever één query met groupBy emuleren via aparte query+JS-aggregation; stuur `Map<string, number>` terug

### 2. Mutations cluster

- Maak `packages/database/src/mutations/topics/`:

  ```
  packages/database/src/mutations/topics/
  ├── index.ts
  ├── crud.ts              # insertTopic, updateTopic, deleteTopic
  ├── status.ts            # updateTopicStatus
  ├── linking.ts           # linkIssueToTopic, unlinkIssueFromTopic
  └── README.md
  ```

- `crud.ts`:
  - `InsertTopicData = { project_id, title, type, ... }`; `created_by` is verplicht (caller geeft door uit auth)
  - `UpdateTopicData` — partial van mutable velden, exclusief `id`, `created_at`, `created_by`, `status` (status via aparte mutation)
  - `deleteTopic` checkt eerst `select count from topic_issues where topic_id = $1` → als >0, gooi `Error('Topic heeft gekoppelde issues; ontkoppel eerst')`

- `status.ts`:
  - `updateTopicStatus(id, newStatus, opts?, client?)` — set `status`; als `newStatus IN ('done','wont_do')`, set `closed_at = now()`; anders unset
  - In fase 1 GEEN transitie-validatie (komt in PR-007 of PR-009 als check-constraint/server-side guard)

- `linking.ts`:
  - `linkIssueToTopic(topicId, issueId, linkedBy, linkedVia='manual', client?)` — INSERT in `topic_issues`; faalt op UNIQUE-constraint als al gekoppeld
  - `unlinkIssueFromTopic(topicId, issueId, client?)` — DELETE; idempotent (als al weg, stilletjes ok)

- **Client-scope beleid**: helpers accepteren optionele `client?: SupabaseClient`; default = admin (zie `packages/database/README.md`).

### 3. Zod-validaties

- Maak `packages/database/src/validations/topics.ts` (of in `apps/devhub/src/features/topics/validations/topic.ts` afhankelijk van wie ze gebruikt — als beide apps Zod gebruiken, central in `packages/database/src/validations/`):

  ```typescript
  import { z } from "zod";
  import { TOPIC_TYPES, TOPIC_LIFECYCLE_STATUSES } from "../constants/topics";

  export const createTopicSchema = z.object({
    project_id: z.string().uuid(),
    title: z.string().min(3).max(200),
    client_title: z.string().max(200).nullable().optional(),
    description: z.string().max(5000).nullable().optional(),
    client_description: z.string().max(5000).nullable().optional(),
    type: z.enum(TOPIC_TYPES),
    priority: z.enum(["P0", "P1", "P2", "P3"]).nullable().optional(),
    target_sprint_id: z.string().max(100).nullable().optional(),
  });
  export type CreateTopicInput = z.infer<typeof createTopicSchema>;

  export const updateTopicSchema = createTopicSchema.partial().omit({ project_id: true });
  export type UpdateTopicInput = z.infer<typeof updateTopicSchema>;

  export const topicStatusSchema = z.object({
    status: z.enum(TOPIC_LIFECYCLE_STATUSES),
    wont_do_reason: z.string().min(10).max(500).optional(), // verplicht als status='wont_do' (check in mutation in PR-009)
  });

  export const linkIssueSchema = z.object({
    topic_id: z.string().uuid(),
    issue_id: z.string().uuid(),
  });
  ```

### 4. Smoke-tests (geen aparte test-sprint)

- Per CLAUDE.md regel: testen is onderdeel van elke micro-sprint. Schrijf:
  - Vitest unit-test voor `topicStatusToBucket` (PR-001 functie) — alle paden
  - Integration-test (`describeWithDb`): insert topic, link 2 issues, check `getTopicWithIssues` — geen N+1
  - Test: `linkIssueToTopic` op reeds-gelinkt issue gooit error
  - Test: `deleteTopic` met linked issues faalt expliciet

## Acceptatiecriteria

- [ ] PR-REQ-010 t/m PR-REQ-014: queries werken via integration-tests
- [ ] PR-REQ-015 t/m PR-REQ-020: mutations werken via integration-tests
- [ ] PR-REQ-021: Zod-schemas exporteren `CreateTopicInput`, `UpdateTopicInput`, etc.
- [ ] PR-REQ-022: `npm run check:queries` slaagt (geen directe `.from('topics')` of `.from('topic_issues')` in apps — er zijn nog geen apps die topics gebruiken, dus dit is preventief)
- [ ] `getTopicWithIssues` doet exact 1 SQL-query (geen N+1)
- [ ] `countIssuesPerTopic` met 10 topic-IDs doet 1 query, geen 10
- [ ] Type-check slaagt; lint slaagt
- [ ] README.md aanwezig in `queries/topics/` en `mutations/topics/`

## Risico's

| Risico                                                            | Mitigatie                                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| PostgREST embed-syntaxis verkeerd geïnterpreteerd (TH-914 lesson) | Test `getTopicWithIssues` eerst lokaal met echte data; geen `referencedTable`-tricks |
| `count='exact'` in PostgREST is duur op grote tabellen            | In dev geen issue; in prod cap op `limit 100` topics tegelijk                        |
| Default-client (admin) bypass-t RLS                               | Tests met expliciete `client?` parameter (anon key) om RLS te valideren              |
| Cluster vs flat verkeerd geïnterpreteerd                          | Topics heeft eigen feature in DevHub → cluster volgens criterium 3 (CLAUDE.md regel) |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/06-fase-1-basis.md` §6.6 (code-organisatie)
- PRD: `docs/specs/prd-portal-roadmap/11-data-model.md` §11.7 (statuses)
- PRD: `docs/specs/prd-portal-roadmap/04-conceptueel-model.md` §4.4 (bucket-mapping)
- CLAUDE.md: Database & Queries (cluster-criteria, helper-signaturen)
- Bestaand patroon: `packages/database/src/queries/issues/` (cluster met list, detail, core)

## Vision-alignment

Past in vision §2.4: queries en mutations zijn de "communication bus"-laag tussen de database en alle quadranten (DevHub, Portal). Geen feature-specifieke logica in deze laag — alleen primitives die door beide apps worden geconsumeerd.

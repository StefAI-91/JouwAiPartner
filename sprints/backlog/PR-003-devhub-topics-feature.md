# Micro Sprint PR-003: DevHub Topics Feature

## Doel

In DevHub een volledige `features/topics/`-feature opleveren waarmee het team topics kan aanmaken, bewerken, bekijken, en issues aan topics kan koppelen/ontkoppelen. Dit is de bron van klant-zichtbare data — zonder DevHub-UI kunnen er geen topics zijn die de Portal toont. Status is in fase 1 handmatig (geen auto-rollup); auto-rollup volgt in PR-007.

## Requirements

| ID            | Beschrijving                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| PR-REQ-030    | DevHub heeft `apps/devhub/src/features/topics/` met `actions/`, `components/`, `validations/` (geen `hooks/` in fase 1)   |
| PR-REQ-031    | Topic-list view: alle topics per project, gefilterd op type (alle / bug / feature) en status (alle / lifecycle-status)    |
| PR-REQ-032    | Topic-create form: title (required), type (required), priority (optioneel), client_title/description (optioneel)          |
| PR-REQ-033    | Topic-edit form: alle velden mutable behalve `id`, `created_at`, `created_by`, `status` (status via dedicated dropdown)   |
| PR-REQ-034    | Topic-status-dropdown: 7 statuses (clustering, awaiting_client_input, prioritized, scheduled, in_progress, done, wont_do) |
| PR-REQ-035    | Linked-issues panel: searchable picker voor bestaande issues in hetzelfde project; link/unlink werkt zonder reload        |
| PR-REQ-036    | Delete-topic toont waarschuwing (geen silent cascade) als `linked_issues > 0`                                             |
| PR-REQ-037    | Topic-detail toont linked issues met links naar `apps/devhub/src/features/issues/[issueId]`                               |
| PR-REQ-038    | `features/topics/README.md` bestaat met menu per laag (per CLAUDE.md vereist)                                             |
| PR-AUTH-001   | Alleen authenticated users met `role IN ('admin','member')` kunnen topics zien/wijzigen — RLS uit PR-001 borgt dit        |
| PR-DESIGN-003 | Cards/badges/topic-form volgen §14 — hairline borders, mono uppercase voor type-badges, geen schaduwen                    |

## Afhankelijkheden

- **PR-001** (database foundation) — schema, types
- **PR-002** (queries/mutations/Zod) — alle data-API-calls

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- **I-6** (twee aparte detail-pagina's vs één gecombineerd) — aanbeveling: twee pagina's met breadcrumb-link (zie §13.3 I-6). Deze sprint volgt die aanbeveling.

## Visuele referentie

- Live preview: `/design-preview/roadmap` op de Vercel-deploy van `apps/portal` (toont consumer-side topic-cards en detail; intern DevHub-design volgt dezelfde editorial principes maar met dichtere lay-out)
- Design-spec: [`docs/specs/prd-portal-roadmap/14-design-keuzes.md`](../../docs/specs/prd-portal-roadmap/14-design-keuzes.md) §14.4 (component-systeem), §14.5 (layout-principes)
- DevHub-context: bestaande `apps/devhub/src/features/issues/` als stijl-referentie (kanban-kolommen, issue-cards)

## Taken

### 1. Feature-folder opzetten

- Maak `apps/devhub/src/features/topics/`:

  ```
  apps/devhub/src/features/topics/
  ├── README.md                 # menu per laag (CLAUDE.md vereist)
  ├── actions/
  │   ├── topics.ts             # createTopic, updateTopic, deleteTopic, updateTopicStatus
  │   └── linking.ts            # linkIssue, unlinkIssue
  ├── components/
  │   ├── topic-list.tsx        # tabular/board view
  │   ├── topic-card.tsx        # card-rendering
  │   ├── topic-form.tsx        # create/edit form
  │   ├── topic-detail.tsx      # detail-pagina body
  │   ├── topic-status-select.tsx
  │   └── linked-issues-panel.tsx
  └── validations/
      └── topic.ts              # re-export uit @repo/database/validations OR app-specifieke uitbreidingen
  ```

- README.md template:

  ```markdown
  # Topics Feature (DevHub)

  ## Actions

  - `createTopic` — Server Action voor nieuw topic
  - `updateTopic` — bewerken van title/desc/priority/etc (geen status)
  - `updateTopicStatus` — handmatige status-change in fase 1
  - `deleteTopic` — verwijdert topic (faalt bij linked issues)
  - `linkIssue` / `unlinkIssue` — koppelingen beheren

  ## Components

  - `TopicList`, `TopicCard`, `TopicForm`, `TopicDetail`, `TopicStatusSelect`, `LinkedIssuesPanel`

  ## Validations

  - Re-export van `@repo/database/validations/topics`
  ```

### 2. Server Actions

- `actions/topics.ts`:

  ```typescript
  "use server";
  import {
    createTopicSchema,
    updateTopicSchema,
    topicStatusSchema,
  } from "@repo/database/validations/topics";
  import {
    insertTopic,
    updateTopic as dbUpdate,
    deleteTopic as dbDelete,
    updateTopicStatus as dbStatus,
  } from "@repo/database/mutations/topics";
  import { getServerClient } from "@repo/database/supabase/server";
  import { revalidatePath } from "next/cache";

  export async function createTopic(input: unknown) {
    const parsed = createTopicSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.flatten() };
    const client = await getServerClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return { error: "Unauthenticated" };
    const result = await insertTopic({ ...parsed.data, created_by: user.id }, client);
    revalidatePath(`/projects/${parsed.data.project_id}/topics`);
    return { success: true, data: result };
  }

  // analoog voor updateTopic, deleteTopic, updateTopicStatus
  ```

- `actions/linking.ts`:
  - `linkIssue({ topic_id, issue_id })` — Zod-validate, call `linkIssueToTopic`, revalidate topic-detail
  - `unlinkIssue` — analoog
  - **Foutafhandeling**: PostgREST UNIQUE-constraint-error bij dubbele link → "Issue is al gekoppeld aan een ander topic"

### 3. Components

- `topic-list.tsx`:
  - Server Component
  - Props: `projectId`
  - Roept `listTopics(projectId)` (uit PR-002)
  - Render: tabel of kanban-board (kies tabel voor v1, simpler) met kolommen: title, type, status, priority, # linked issues, updated_at
  - Filter-controls (type, status) als query-params
  - Header-knop "Nieuw topic" → modal of route naar `/projects/[id]/topics/new`

- `topic-card.tsx`:
  - Klikbare card, hairline border, geen schaduw (§14.4)
  - Type-badge (mono uppercase), status-pill, priority-tekst (P0 rood, P3 grijs)

- `topic-form.tsx`:
  - Client Component (heeft form-state)
  - Velden: title, type-radio, priority-select, target_sprint_id (text input), client_title, client_description (textarea, markdown hint)
  - Bij submit: `createTopic` of `updateTopic` Server Action; toont Zod-errors per veld

- `topic-status-select.tsx`:
  - Client Component, dropdown met 7 statuses (in fase 1 nog géén `wont_do_proposed_by_client` — die komt in PR-010)
  - Op change: `updateTopicStatus` Server Action; optimistic update of revalidate

- `linked-issues-panel.tsx`:
  - Client Component
  - Toont gekoppelde issues (uit `getTopicWithIssues`)
  - Searchable picker (Combobox) voor andere issues in hetzelfde project (server-side search via `searchIssuesByProject`-query — als die niet bestaat, gebruik bestaande `listIssues` met filter)
  - Knop "Koppel" → `linkIssue` Server Action
  - X-icon naast elk linked issue → `unlinkIssue`

- `topic-detail.tsx`:
  - Server Component
  - Roept `getTopicWithIssues(topicId)`
  - Layout: title + meta-rij (type/status/priority/created_at), `client_description` markdown, `LinkedIssuesPanel`, "Bewerk topic"-knop, "Verwijder topic"-knop met bevestiging

### 4. Routes

- `apps/devhub/src/app/(dashboard)/projects/[projectId]/topics/page.tsx`:
  - Server Component
  - Render `<TopicList projectId={...} />`
- `apps/devhub/src/app/(dashboard)/projects/[projectId]/topics/[topicId]/page.tsx`:
  - Server Component
  - Render `<TopicDetail topicId={...} />`
- `apps/devhub/src/app/(dashboard)/projects/[projectId]/topics/new/page.tsx`:
  - Render `<TopicForm projectId={...} />`
- `loading.tsx` en `error.tsx` per route

### 5. Navigatie

- Voeg "Topics"-link toe aan project-subnav in DevHub-sidebar
- Op issue-detail-pagina: voeg breadcrumb "Onderdeel van topic: [titel]" als issue gekoppeld is (haakt op PR-007 dat `topic_id` op issue read-time joint; voor nu: query `getTopicForIssue(issueId)` toevoegen aan PR-002 als het ontbreekt)

### 6. CLAUDE.md registry update

- Update `CLAUDE.md` feature-structuur tabel: voeg `topics` toe aan DevHub Features rij. Doe dit in dezelfde PR.

## Acceptatiecriteria

- [ ] PR-REQ-030: feature-folder bestaat met juiste structuur, README.md aanwezig
- [ ] PR-REQ-031: list view filtert op type EN status, beide samen
- [ ] PR-REQ-032: nieuw topic aanmaken via form persisteert (check DB)
- [ ] PR-REQ-033: edit form past velden aan; status NIET via dit form (alleen via dropdown)
- [ ] PR-REQ-034: status-dropdown toont 7 statuses (geen `wont_do_proposed_by_client` in fase 1 UI)
- [ ] PR-REQ-035: searchable picker vindt issues binnen project; koppel/ontkoppel werkt
- [ ] PR-REQ-036: verwijderen van topic met linked issues toont waarschuwing en faalt zonder kracht-cascade
- [ ] PR-REQ-037: topic-detail toont linked issues, klik gaat naar issue-detail
- [ ] PR-REQ-038: README.md aanwezig met menu per laag
- [ ] PR-AUTH-001: client-rol kan deze pagina's niet openen (RLS + middleware)
- [ ] PR-DESIGN-003: visueel komt overeen met §14 — geen schaduwen, hairline borders, mono uppercase op type-badges
- [ ] Type-check slaagt; lint slaagt; `npm run check:queries` slaagt
- [ ] Vitest: smoke-tests voor Server Actions (Zod-validatie + happy path met DB-mock op de DB-grens)

## Risico's

| Risico                                                                 | Mitigatie                                                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Searchable picker laadt alle issues van project (kan 100+ zijn) → slow | Server-side search met query `?q=...`; cap op 50 results; pagination niet nodig in v1 |
| Modal vs eigen pagina voor topic-creatie                               | Eigen pagina (Next 16 conventie) — modal kan in v2; minder state-management nu        |
| Status-dropdown laat illegale transities toe                           | Bewust zo in fase 1; PR-007/PR-009 voegen transitie-validatie toe                     |
| Klanten zien topics in `clustering` → privacy-leak                     | RLS uit PR-001 blokkeert dit; deze sprint hoeft het niet expliciet te checken         |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/06-fase-1-basis.md` §6.3.1, §6.3.2 (DevHub functionaliteit), §6.6 (code-organisatie), §6.7 (acceptatie)
- PRD: `docs/specs/prd-portal-roadmap/12-devhub-workflow.md` §12.3.2 (topic board), §12.3.3 (topic detail)
- PRD: `docs/specs/prd-portal-roadmap/13-validatie-en-open-vragen.md` §13.3 I-6
- PRD: `docs/specs/prd-portal-roadmap/14-design-keuzes.md` §14.4
- CLAUDE.md: Feature-structuur (registry update vereist)

## Vision-alignment

Past in vision §2.4 — DevHub is de "build" quadrant waar topics ontstaan en worden gecureerd. Zonder de DevHub-UI bestaat het topic-concept alleen op papier. Past op platform-vision principe "verification before truth": team-member cureert handmatig vóór publicatie naar Portal.

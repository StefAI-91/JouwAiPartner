# Micro Sprint PR-008: DevHub Triage-Queue

## Doel

Een nieuwe compositiepagina in DevHub waar het team alle issues ziet met `topic_id IS NULL` (ungrouped). Per issue kan het team koppelen aan een bestaand topic, een nieuw topic aanmaken (pre-fill met issue-data), of de issue markeren als "geen topic nodig". Een counter in de DevHub-nav toont het aantal ungrouped issues — altijd zichtbaar zodat dit niet stilletjes groeit. Voorkomt dat issues onzichtbaar voor klant blijven hangen (de "donkere materie"-failure-mode uit §12.7).

## Requirements

| ID            | Beschrijving                                                                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-REQ-080    | Pagina `apps/devhub/src/components/triage/page.tsx` toont alle ungrouped issues, oudste eerst                                                   |
| PR-REQ-081    | Per issue: title, type, created_at, submitter, knoppen "Koppel aan topic" / "Maak nieuw topic" / "Geen topic nodig"                             |
| PR-REQ-082    | Knop "Koppel aan topic" opent searchable picker over bestaande topics in hetzelfde project; gefilterd op `clustering` + `awaiting_client_input` |
| PR-REQ-083    | Knop "Maak nieuw topic" navigeert naar topic-create-form met pre-filled velden (title, description, type uit issue)                             |
| PR-REQ-084    | Knop "Geen topic nodig" zet `issue.skip_topic = true` óf labelt issue zodat het uit triage-queue verdwijnt — zie open vraag                     |
| PR-REQ-085    | Counter "X ungrouped" in DevHub-sidebar — altijd zichtbaar, klikbaar naar triage-queue                                                          |
| PR-REQ-086    | Counter live-update via revalidatePath na link-actie                                                                                            |
| PR-REQ-087    | Bulk-select: checkbox per row + "Groepeer geselecteerde in nieuw topic"-knop                                                                    |
| PR-REQ-088    | Empty-state: vriendelijke melding "Geen ungrouped issues — netjes!"                                                                             |
| PR-REQ-089    | Pagina is `compositiepagina` (geen feature-folder) per CLAUDE.md regel — leest data via queries, mutaties via bestaande `topics` feature        |
| PR-DESIGN-020 | Tabular dichtheid (`md:` kolommen), hairline borders, mono uppercase voor type-badges                                                           |

## Afhankelijkheden

- **PR-001** (topics) + **PR-002** (queries/mutations) + **PR-003** (DevHub topic feature voor topic-create-form)
- Bestaand: `issues`-tabel, `apps/devhub/src/features/issues/`

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- **Open vraag (impliciet uit §8.3.3)**: hoe markeer je "geen topic nodig"? Twee opties:
  - **A**: Nieuwe kolom `issues.skip_topic boolean DEFAULT false` — sterk-typed, queryable
  - **B**: Bestaand label-systeem — "no-topic-needed"-tag op issue
  - **Aanbeveling**: A (nieuwe kolom). Simpler. Maar bevestigen voor migratie-write.

## Visuele referentie

- Geen aparte preview voor triage; volg DevHub-bestaande issue-list als stijl-anchor
- Design-spec: §14.4 (cards/badges), §14.5 (density alleen waar data telt)

## Taken

### 1. (Mogelijk) Migratie — `issues.skip_topic`

- Als open vraag → A: maak `supabase/migrations/<datum>_issues_skip_topic.sql`:

  ```sql
  ALTER TABLE issues ADD COLUMN IF NOT EXISTS skip_topic boolean NOT NULL DEFAULT false;
  CREATE INDEX IF NOT EXISTS idx_issues_skip_topic ON issues(skip_topic) WHERE skip_topic = false;
  ```

- Index alleen op `false`-rijen omdat queue alleen die zoekt.

### 2. Query toevoegen

- `packages/database/src/queries/topics/triage.ts`:

  ```typescript
  export async function listUngroupedIssues(projectId: string, client?: SupabaseClient) {
    // SELECT issues waar topic_id IS NULL via NOT EXISTS topic_issues + skip_topic = false
    return await (client ?? getAdminClient())
      .from("issues")
      .select("id, title, type, status, created_at, created_by")
      .eq("project_id", projectId)
      .eq("skip_topic", false)
      .not("id", "in", `(SELECT issue_id FROM topic_issues)`) // PostgREST mag dit niet direct — gebruik rpc of JS-filter
      .order("created_at", { ascending: true });
  }

  export async function countUngroupedIssues(projectId?: string, client?: SupabaseClient) {
    /* count met dezelfde filters */
  }
  ```

- **Note**: PostgREST kan `NOT EXISTS` lastig — alternatief: laad alle issue-IDs in `topic_issues`, filter in JS. Of een Postgres-VIEW `ungrouped_issues_view`. Voor v1: SQL-VIEW is simpelst.

  ```sql
  CREATE OR REPLACE VIEW ungrouped_issues_view AS
    SELECT i.* FROM issues i
    LEFT JOIN topic_issues ti ON ti.issue_id = i.id
    WHERE ti.issue_id IS NULL AND COALESCE(i.skip_topic, false) = false;
  ```

### 3. Compositiepagina

- Maak `apps/devhub/src/components/triage/`:

  ```
  apps/devhub/src/components/triage/
  ├── page.tsx                  # entry — Server Component
  ├── ungrouped-issues-list.tsx # tabel-render
  ├── topic-picker.tsx          # Combobox (Client)
  ├── bulk-action-bar.tsx       # bulk-select + groepeer-knop
  └── empty-state.tsx
  ```

- Compositiepagina, geen feature-folder (CLAUDE.md regel)

### 4. Routes

- `apps/devhub/src/app/(dashboard)/triage/page.tsx`:
  - Server Component
  - Fetch: `listUngroupedIssues()` (cross-project of per-project filter via search-param)
  - Render `<UngroupedIssuesList issues={issues} />`
- `loading.tsx`, `error.tsx`

### 5. Topic-picker

- `topic-picker.tsx` (`"use client"`):
  - Searchable Combobox over topics in het project van het issue (filtered op `clustering` + `awaiting_client_input`)
  - Bij selectie: roep Server Action `linkIssue(topicId, issueId)`
  - Toast bij success; revalidate

### 6. Bulk-actie

- `bulk-action-bar.tsx`:
  - Checkbox per rij in de lijst
  - Wanneer ≥1 geselecteerd: bar verschijnt met "Maak nieuw topic met X issues"
  - Klik → naar topic-create-form met pre-filled `linked_issues=[id1,id2,...]` (via query-string of session-storage)
  - Topic-create-form (uit PR-003) leest `linked_issues` en koppelt na create

### 7. Counter in DevHub-nav

- Update `apps/devhub/src/components/layout/sidebar.tsx` (of vergelijkbaar):
  - Voeg sectie "Triage" toe met `<TriageCounter />`
  - Counter: Server Component dat `countUngroupedIssues()` roept, render badge "12 ungrouped"

### 8. "Geen topic nodig" actie

- `apps/devhub/src/components/triage/actions/triage.ts` (Server Actions):
  - `markIssueSkipTopic(issueId)` → `update issues set skip_topic = true`
  - Revalidate triage-pagina

### 9. CLAUDE.md update

- Voeg `triage` toe aan DevHub Compositiepagina's-rij in registry

## Acceptatiecriteria

- [ ] PR-REQ-080: pagina toont oudste ungrouped issue eerst
- [ ] PR-REQ-081: knoppen aanwezig per row
- [ ] PR-REQ-082: picker filtert op project, toont alleen relevante topics
- [ ] PR-REQ-083: nieuw-topic-knop pre-fills correct
- [ ] PR-REQ-084: "Geen topic nodig" verbergt issue uit queue (skip_topic=true)
- [ ] PR-REQ-085/086: counter zichtbaar in nav, update na actie
- [ ] PR-REQ-087: bulk-select werkt; groepeer-actie maakt 1 topic met N linked issues
- [ ] PR-REQ-088: empty-state-tekst aanwezig
- [ ] PR-REQ-089: structuur volgt CLAUDE.md (compositiepagina, geen feature)
- [ ] Type-check + lint + check:queries slagen
- [ ] Vitest: render-tests voor lijst en empty-state

## Risico's

| Risico                                              | Mitigatie                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------- |
| Counter doet query op elke nav-render → performance | Cache 60sec via React cache of Next.js segment-cache                            |
| `NOT EXISTS` in PostgREST werkt niet zoals verwacht | Gebruik SQL-VIEW (`ungrouped_issues_view`) i.p.v. embed-trickery                |
| Triage-queue blijft groeien (team negeert)          | Counter altijd zichtbaar; in v2: PR-template vraagt "ungrouped opgeruimd?"      |
| Bulk-actie state via query-string is fragile        | Server Action accepteert `issueIds[]` direct via FormData; geen URL-state nodig |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/08-fase-3-lifecycle.md` §8.3.3 (triage-queue)
- PRD: `docs/specs/prd-portal-roadmap/12-devhub-workflow.md` §12.3.1 (triage screen)
- CLAUDE.md: feature-structuur (compositiepagina-criterium)

## Vision-alignment

Vision §2.4 — triage is dé brug tussen ruwe issue-instroom en klant-zichtbare topic-laag. Zonder triage is de feedbackloop kapot want issues verdwijnen in zwart gat.

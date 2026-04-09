# Micro Sprint DH-002: Queries en mutations voor issues

## Doel

Alle database query- en mutatiefuncties bouwen in het shared `@repo/database` package. Dit zijn de bouwstenen die de DevHub app gebruikt voor alle database-interacties. Na deze sprint bestaan alle functies om issues te lezen, schrijven, en counts op te halen. Status page queries (getProjectByKey, listPublicIssues, getPublicIssueCounts) worden in fase 2 toegevoegd bij DH-008.

## Requirements

| ID           | Beschrijving                                                                                                    |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| FUNC-144     | Query: listIssues met filters (projectId, status, priority, type, component, assignedTo, search, limit, offset) |
| FUNC-145     | Query: getIssueById                                                                                             |
| FUNC-146     | Query: getIssueCounts per project (backlog, todo, in_progress, done, cancelled)                                 |
| FUNC-147     | Query: listIssueComments                                                                                        |
| FUNC-148     | Query: listIssueActivity                                                                                        |
| FUNC-149     | Mutation: insertIssue                                                                                           |
| FUNC-150     | Mutation: updateIssue                                                                                           |
| FUNC-151     | Mutation: deleteIssue                                                                                           |
| FUNC-152     | Mutation: insertComment                                                                                         |
| FUNC-153     | Mutation: insertActivity                                                                                        |
| ~~FUNC-154~~ | ~~Query: getProjectByKey (status page)~~ — verplaatst naar DH-008 (fase 2)                                      |
| ~~FUNC-155~~ | ~~Query: listPublicIssues~~ — verplaatst naar DH-008 (fase 2)                                                   |
| ~~FUNC-156~~ | ~~Query: getPublicIssueCounts~~ — verplaatst naar DH-008 (fase 2)                                               |

## Bronverwijzingen

- PRD: `docs/specs/prd-devhub.md` -> sectie "Database queries (signatures)" (regels 963-983)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Nieuwe bestanden in shared packages" (regels 947-961)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Queries (in @repo/database)" (regels 928-935)

## Context

### Query signatures

```typescript
// packages/database/src/queries/issues.ts
function listIssues(params: {
  projectId: string;
  status?: string[];
  priority?: string[];
  type?: string[];
  component?: string[];
  assignedTo?: string;
  search?: string;
  limit?: number; // default 50
  offset?: number; // default 0
}): Promise<Issue[]>;

function getIssueById(id: string): Promise<Issue | null>;

function getIssueCounts(projectId: string): Promise<{
  backlog: number;
  todo: number;
  in_progress: number;
  done: number;
  cancelled: number;
}>;

function listIssueComments(issueId: string): Promise<IssueComment[]>;
function listIssueActivity(issueId: string): Promise<IssueActivity[]>;
```

### Mutation signatures

```typescript
// packages/database/src/mutations/issues.ts
function insertIssue(data: InsertIssueData): Promise<Issue>;
function updateIssue(id: string, data: UpdateIssueData): Promise<Issue>;
function deleteIssue(id: string): Promise<void>;
function insertComment(data: {
  issue_id: string;
  author_id: string;
  body: string;
}): Promise<IssueComment>;
function insertActivity(data: {
  issue_id: string;
  actor_id?: string;
  action: string;
  field?: string;
  old_value?: string;
  new_value?: string;
  metadata?: Record<string, unknown>;
}): Promise<void>;
```

### Status page queries — VERPLAATST NAAR FASE 2

> Status page queries (getProjectByKey, listPublicIssues, getPublicIssueCounts) worden in fase 2 gebouwd als onderdeel van DH-008.

### Relevante conventies (uit CLAUDE.md)

- Geen `select('*')` — selecteer alleen kolommen die nodig zijn
- Geen queries in loops (N+1)
- Filter op de database, niet in JS
- Centraliseer queries in `packages/database/src/queries/`
- Mutations in `packages/database/src/mutations/`
- Query functies: `get`/`list` prefix
- `listIssues` moet een Supabase join doen op `people` voor `assigned_to` naam/avatar
- Status page queries gebruiken admin client (`getAdminClient`)

### listIssues filter logica

De `listIssues` query moet multiple filters combineren:

- `status` array: `.in('status', statusArray)`
- `priority` array: `.in('priority', priorityArray)`
- `type` array: `.in('type', typeArray)`
- `component` array: `.in('component', componentArray)`
- `assignedTo` string: `.eq('assigned_to', assignedTo)`
- `search` string: `.or(`title.ilike.%search%,description.ilike.%search%`)`
- Standaard sortering: priority (urgent > high > medium > low), dan created_at DESC
- Voor priority sortering: gebruik `.order()` met een custom order — overweeg een computed column of sorteer in de query logica

## Prerequisites

- [ ] Micro Sprint DH-001: Database issues tabellen + RLS moet afgerond zijn

## Taken

- [ ] Maak `packages/database/src/queries/issues.ts` met listIssues, getIssueById, getIssueCounts, listIssueComments, listIssueActivity
- [ ] Maak `packages/database/src/mutations/issues.ts` met insertIssue (incl. issue_number_seq upsert), updateIssue, deleteIssue, insertComment, insertActivity
- [ ] Exporteer alle functies correct vanuit het package (check `packages/database/package.json` exports)

## Acceptatiecriteria

- [ ] [FUNC-144] listIssues filtert correct op alle parameters (projectId, status[], priority[], type[], component[], assignedTo, search)
- [ ] [FUNC-144] listIssues sorteert standaard op priority (urgent eerst) en created_at DESC
- [ ] [FUNC-144] listIssues ondersteunt pagination via limit/offset
- [ ] [FUNC-145] getIssueById retourneert null als issue niet bestaat
- [ ] [FUNC-146] getIssueCounts retourneert correcte counts per status
- [ ] [FUNC-147] listIssueComments retourneert comments gesorteerd op created_at ASC
- [ ] [FUNC-148] listIssueActivity retourneert activity gesorteerd op created_at DESC
- [ ] [FUNC-149] insertIssue slaat een issue op en retourneert het volledige record
- [ ] [FUNC-150] updateIssue wijzigt alleen meegegeven velden
- [ ] [FUNC-151] deleteIssue verwijdert het issue (cascade verwijdert comments en activity)
- [ ] [FUNC-152] insertComment slaat een comment op met correcte author_id
- [ ] [FUNC-153] insertActivity logt een activity entry
- [ ] insertIssue gebruikt issue_number_seq tabel voor atomaire nummering (geen race conditions)
- [ ] Geen `select('*')` in enige query
- [ ] TypeScript compileert zonder fouten

## Geraakt door deze sprint

- `packages/database/src/queries/issues.ts` (nieuw)
- `packages/database/src/mutations/issues.ts` (nieuw)
- `packages/database/package.json` (mogelijk: exports bijwerken)

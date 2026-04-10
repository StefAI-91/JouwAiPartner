# Micro Sprint DH-012: Error handling consistentie en architectuur hygiëne

## Doel

De inconsistenties in error handling, directe Supabase calls, en ontbrekende audit trail velden oplossen. Na deze sprint gebruiken alle mutations hetzelfde error patroon, zijn alle database calls gecentraliseerd in `@repo/database`, en is de activity logging compleet. Dit maakt de codebase voorspelbaar voor toekomstige ontwikkeling.

## Bevindingen uit architectuurreview

Deze sprint adresseert de volgende bevindingen uit de DevHub architectuurreview (10 april 2026):

| #   | Bevinding                                                                            | Ernst  | Locatie                                                |
| --- | ------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------ |
| 13  | Error handling inconsistentie: issues mutations throwen, rest retourneert            | HOOG   | `mutations/issues.ts` vs alle andere mutations         |
| 14  | Directe Supabase calls in server actions (hoort in @repo/database)                   | HOOG   | `actions/import.ts:122-141`, `actions/review.ts:41-45` |
| 15  | Ontbrekende actor_id in background activity                                          | MEDIUM | `actions/execute.ts:131-135`                           |
| 16  | Ontbrekende validatie schemas voor sommige mutations                                 | MEDIUM | Diverse mutations in `@repo/database`                  |
| 17  | Query error handling inconsistentie: sommige queries throwen, sommige retourneren [] | MEDIUM | `queries/meetings.ts` vs andere queries                |
| 18  | Ongebruikte dependency @base-ui/react                                                | LAAG   | `apps/devhub/package.json`                             |

## Taken

### Taak 1: Mutations error handling standaardiseren

**Probleem:** `mutations/issues.ts` gebruikt `throw new Error()` voor alle 8 functies, terwijl alle andere mutation files (`projects.ts`, `organizations.ts`, `people.ts`, `meetings.ts`, 85+ functies) `{ error: string }` retourneren. Dit veroorzaakt cognitieve last en bugs bij het wisselen tussen domeinen.

**Oplossing:**

- [ ] Refactor `packages/database/src/mutations/issues.ts` — alle functies die nu throwen omzetten naar het return-based patroon:
  - `insertIssue()` — nu: `throw`, wordt: `{ success: true; data: IssueRow } | { error: string }`
  - `updateIssue()` — nu: `throw`, wordt: `{ success: true; data: IssueRow } | { error: string }`
  - `deleteIssue()` — nu: `throw`, wordt: `{ success: true } | { error: string }`
  - `insertComment()` — nu: `throw`, wordt: `{ success: true } | { error: string }`
  - `updateComment()` — nu: `throw`, wordt: `{ success: true } | { error: string }`
  - `deleteComment()` — nu: `throw`, wordt: `{ success: true } | { error: string }`
  - `insertActivity()` — nu: `throw`, wordt: `{ success: true } | { error: string }`
  - `upsertUserbackIssues()` — nu: `throw`, wordt: `{ success: true; data } | { error: string }`
- [ ] Update alle consumers in `apps/devhub/src/actions/` om het nieuwe return format te gebruiken (try/catch -> result check)
- [ ] Update consumers in `apps/devhub/src/app/api/ingest/userback/route.ts`

**Geraakt:**

- `packages/database/src/mutations/issues.ts` (refactor alle functies)
- `apps/devhub/src/actions/issues.ts` (consumer update)
- `apps/devhub/src/actions/comments.ts` (consumer update)
- `apps/devhub/src/actions/classify.ts` (consumer update)
- `apps/devhub/src/actions/execute.ts` (consumer update)
- `apps/devhub/src/actions/import.ts` (consumer update)
- `apps/devhub/src/app/api/ingest/userback/route.ts` (consumer update)

**Let op:** Check ook of cockpit actions of AI pipeline code deze mutations aanroept. Zoek naar alle imports van `@repo/database/mutations/issues` in de hele codebase.

### Taak 2: Directe Supabase calls extraheren naar queries

**Probleem:** Twee server actions bevatten directe `admin.from("issues").select(...)` calls in plaats van gecentraliseerde query functies te gebruiken.

**Locatie 1 — `actions/review.ts:41-45`:**

```typescript
const { data: project } = await db
  .from("projects")
  .select("name")
  .eq("id", parsed.data.projectId)
  .single();
```

**Locatie 2 — `actions/import.ts:122-141`:**

```typescript
// Twee directe queries:
// 1. Ophalen van userback issues zonder attachments
// 2. Ophalen van bestaande attachments per issue_id
```

**Oplossing:**

- [ ] **Review.ts fix:** Gebruik de bestaande `getProjectById()` query uit `packages/database/src/queries/projects.ts` (of maak een minimale `getProjectName()` als die niet bestaat)
- [ ] **Import.ts fix 1:** Maak `listUserbackIssuesWithoutAttachments()` in `packages/database/src/queries/issues.ts` — retourneert issues met `source = "userback"` die geen attachments hebben
- [ ] **Import.ts fix 2:** Maak `getIssueIdsWithAttachments()` in `packages/database/src/queries/issues.ts` — retourneert een `Set<string>` van issue IDs die al attachments hebben
- [ ] Update beide actions om de nieuwe query functies te gebruiken

**Geraakt:**

- `packages/database/src/queries/issues.ts` (2 nieuwe queries)
- `packages/database/src/queries/projects.ts` (controleer of getProjectName bestaat)
- `apps/devhub/src/actions/review.ts` (directe call vervangen)
- `apps/devhub/src/actions/import.ts` (directe calls vervangen)

### Taak 3: Actor_id in background activity

**Probleem:** `simulateStepProgression()` in `actions/execute.ts:131-135` voegt activity records toe zonder `actor_id`. De audit trail verliest hierdoor wie de AI executie heeft gestart.

**Oplossing:**

- [ ] Pas `simulateStepProgression()` aan: voeg `actorId: string` parameter toe
- [ ] In `startAiExecution()`: geef `user.id` door aan `simulateStepProgression()`
- [ ] In de `insertActivity()` call op regel 131: voeg `actor_id: actorId` toe
- [ ] Signature wordt: `async function simulateStepProgression(issueId: string, totalSteps: number, actorId: string)`

**Geraakt:**

- `apps/devhub/src/actions/execute.ts` (wijziging)

### Taak 4: Ontbrekende validatie schemas

**Probleem:** Diverse mutations in `@repo/database` hebben geen bijbehorende Zod schemas:

| Mutation                        | File                         | Ontbreekt               |
| ------------------------------- | ---------------------------- | ----------------------- |
| `updateMeetingTitle()`          | `mutations/meetings.ts`      | Geen title length check |
| `updateMeetingClassification()` | `mutations/meetings.ts`      | Geen schema             |
| `updatePerson()`                | `mutations/people.ts`        | Geen input schema       |
| `updateOrganization()`          | `mutations/organizations.ts` | Geen input schema       |

**Oplossing:**

- [ ] Controleer: worden deze mutations aangeroepen vanuit DevHub? Zo niet, dan is dit cockpit-scope en kan het later
- [ ] Voor DevHub-relevante mutations: voeg Zod schemas toe in de juiste validatie files
- [ ] Minimaal: zorg dat alle mutations die vanuit DevHub server actions worden aangeroepen een validatie schema hebben

**Geraakt:**

- `packages/database/src/validations/` (eventuele nieuwe schemas)

**Let op:** Dit is een audit taak. Als alle DevHub mutations al gevalideerd zijn (wat grotendeels het geval is), dan is deze taak snel klaar. De meeste ontbrekende schemas zijn cockpit-gerelateerd.

### Taak 5: Query error handling standaardiseren

**Probleem:** `listVerifiedMeetings()` in `queries/meetings.ts` gooit een error bij een database fout, terwijl alle andere list-queries een lege array retourneren. Dit maakt error handling onvoorspelbaar.

**Oplossing:**

- [ ] Wijzig `listVerifiedMeetings()` in `packages/database/src/queries/meetings.ts` — vervang `throw` door `console.error` + `return []`
- [ ] Scan andere query files voor vergelijkbare inconsistenties
- [ ] Standaard: list queries retourneren `[]` bij fouten, single-item queries retourneren `null`

**Geraakt:**

- `packages/database/src/queries/meetings.ts` (wijziging)
- Eventueel andere query files als er meer inconsistenties zijn

### Taak 6: Ongebruikte dependency opruimen

**Probleem:** `@base-ui/react` staat in `apps/devhub/package.json` maar wordt nergens in de DevHub codebase geimporteerd.

**Oplossing:**

- [ ] Verifieer met grep dat `@base-ui/react` nergens geimporteerd wordt in `apps/devhub/`
- [ ] Verwijder `@base-ui/react` uit `apps/devhub/package.json`
- [ ] Run `npm install` om de lockfile bij te werken

**Geraakt:**

- `apps/devhub/package.json` (dependency verwijderen)

## Acceptatiecriteria

- [ ] Alle functies in `mutations/issues.ts` retourneren `{ success } | { error }` in plaats van te throwen
- [ ] Alle consumers van issues mutations zijn bijgewerkt (geen try/catch meer nodig voor mutation calls)
- [ ] `actions/review.ts` bevat geen directe `supabase.from()` calls meer
- [ ] `actions/import.ts` bevat geen directe `supabase.from()` calls meer
- [ ] `simulateStepProgression()` logt `actor_id` in activity records
- [ ] `listVerifiedMeetings()` throwt niet meer bij database fouten
- [ ] `@base-ui/react` is verwijderd uit devhub dependencies
- [ ] `npm run build` slaagt
- [ ] `npm run type-check` slaagt
- [ ] Geen regressies in bestaande functionaliteit (issue CRUD, comments, classify, sync)

## Geraakt door deze sprint

- `packages/database/src/mutations/issues.ts` (refactor)
- `packages/database/src/queries/issues.ts` (2 nieuwe queries)
- `packages/database/src/queries/meetings.ts` (wijziging)
- `packages/database/src/queries/projects.ts` (controle/eventuele wijziging)
- `apps/devhub/src/actions/issues.ts` (consumer update)
- `apps/devhub/src/actions/comments.ts` (consumer update)
- `apps/devhub/src/actions/classify.ts` (consumer update)
- `apps/devhub/src/actions/execute.ts` (wijziging)
- `apps/devhub/src/actions/import.ts` (consumer update)
- `apps/devhub/src/actions/review.ts` (directe call vervangen)
- `apps/devhub/src/app/api/ingest/userback/route.ts` (consumer update)
- `apps/devhub/package.json` (dependency verwijderen)

# Micro Sprint DH-016: DevHub per-project enforcement (app-layer)

## Doel

DevHub moet per project afgeschermd worden: members zien en muteren alleen issues/comments/activity binnen projecten waar ze via `devhub_project_access` aan gekoppeld zijn. Admins zien alles zonder rows. Deze sprint voegt de applicatie-layer checks toe aan álle devhub Server Actions, queries en pages. RLS (database-laag) volgt in DH-017 als defense-in-depth — beide samen getest.

**UX-regel**: directe URL-access naar een issue in een niet-toegewezen project toont een 404 (niet 403), om info-leak over het bestaan van issues te voorkomen.

## Requirements

| ID       | Beschrijving                                                                                                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-154  | DevHub issue list toont alleen issues uit projecten die via `listAccessibleProjectIds(userId)` voor de huidige user beschikbaar zijn.                            |
| SEC-155  | DevHub issue detail page (`/issues/[id]`) rendert 404 via `notFound()` wanneer de user geen toegang heeft tot het project waartoe het issue behoort.             |
| SEC-156  | `createIssueAction` controleert dat de user toegang heeft tot `project_id` in de payload vóór insert.                                                            |
| SEC-157  | `updateIssueAction` en `deleteIssueAction` controleren access op basis van het bestaande `issue.project_id`, niet op basis van client-side input.                |
| SEC-158  | `createCommentAction`, `updateCommentAction`, `deleteCommentAction` controleren project-access via het gerelateerde issue.                                       |
| SEC-159  | `insertActivity` calls (vanuit actions) gebeuren pas ná succesvolle access-assertie.                                                                             |
| SEC-160  | Triage/sidebar/ai-classificatie actions respecteren access-check (member met 1 project ziet geen triage-counts van andere projecten).                            |
| FUNC-160 | Project-selector in DevHub UI toont alleen toegewezen projecten (admins zien alle).                                                                              |
| EDGE-150 | Navigatie naar `/issues/[id]` voor een issue buiten toegang → 404 page. Geen hint in URL/title over bestaan.                                                     |
| EDGE-151 | Member zonder enkele `devhub_project_access` row ziet een lege project-lijst met duidelijke uitleg ("Je hebt nog geen toegang tot projecten. Vraag een admin."). |

## Bronverwijzingen

- Scope-afspraken: prompt scope-beslissingen 1, 10, 14, 15
- Bestaand: `packages/database/src/queries/project-access.ts` (zal in DH-014 al opgeschoond zijn)
- Actions die hardened moeten worden: `apps/devhub/src/actions/{issues,comments,classify,execute,import,review}.ts`
- Queries mogelijk aan te passen: `packages/database/src/queries/issues.ts`, `.../issue-comments.ts` (indien bestaand), `.../issue-activity.ts`
- Pages: `apps/devhub/src/app/(app)/page.tsx` (issue list), `apps/devhub/src/app/(app)/issues/[id]/page.tsx`
- Helper: `assertProjectAccess` uit DH-014 (`@repo/auth/access`)

## Context

### Patroon voor Server Actions

```typescript
// apps/devhub/src/actions/issues.ts
import { assertProjectAccess, NotAuthorizedError } from "@repo/auth/access";

export async function createIssueAction(input) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = createIssueSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  try {
    await assertProjectAccess(user.id, parsed.data.project_id);
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: "Geen toegang tot dit project" };
    throw e;
  }

  // rest ongewijzigd
}

export async function updateIssueAction(input) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  // ...parse
  const current = await getIssueById(parsed.data.id);
  if (!current) return { error: "Issue niet gevonden" };

  try {
    await assertProjectAccess(user.id, current.project_id);
  } catch {
    // Bewust zelfde fout als "niet gevonden" om info-leak te voorkomen
    return { error: "Issue niet gevonden" };
  }
  // ...
}
```

### Patroon voor pages

```typescript
// apps/devhub/src/app/(app)/issues/[id]/page.tsx
import { notFound } from "next/navigation";
import { assertProjectAccess, NotAuthorizedError } from "@repo/auth/access";

export default async function IssuePage({ params }) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const issue = await getIssueById(params.id);
  if (!issue) notFound();
  try {
    await assertProjectAccess(user.id, issue.project_id);
  } catch (e) {
    if (e instanceof NotAuthorizedError) notFound(); // 404, geen 403
    throw e;
  }
  // render
}
```

### Patroon voor issue list

```typescript
// apps/devhub/src/app/(app)/page.tsx
const projectIds = await listAccessibleProjectIds(user.id);
if (projectIds.length === 0) {
  return <EmptyState message="Je hebt nog geen toegang tot projecten. Vraag een admin om je toe te voegen." />;
}
const issues = await listIssues({ projectIds, ...filters });
```

Belangrijk: bestaande `listIssues` query mogelijk aanpassen zodat hij een `projectIds: string[]` filter accepteert (in-clause). Niet al filteren op `project_id: single` — dat werkt niet voor het list-overzicht.

### Info-leak richtlijnen

- 404 in plaats van 403 bij `/issues/[id]` → zelfde respons als wanneer issue niet bestaat.
- `updateIssueAction` bij niet-toegang retourneert dezelfde error als "niet gevonden".
- Response bodies bevatten geen project-namen of IDs van projecten waar de user geen toegang toe heeft.

### Comments/Activity

Scope-beslissing 15: members zien alle comments + activity op issues binnen toegewezen projecten. Geen intern/extern filter nodig. Alleen de access-laag op issue/project-niveau is voldoende.

### Risico's

- **Queries die servicerole-client gebruiken negeren access** (bv. background classifier via `getAdminClient()`). Die zijn OK zolang ze server-internal zijn. Wel documenteren dat deze worden overgeslagen — géén user-triggered admin-calls.
- **Perf**: `assertProjectAccess` doet per action 1 extra query. Acceptabel. Voor lijst-pages gebruiken we `listAccessibleProjectIds` éénmalig.

## Prerequisites

- [x] DH-013: DB fundering
- [x] DH-014: Auth helpers (`assertProjectAccess`, `listAccessibleProjectIds`)

## Taken

- [ ] Harden `apps/devhub/src/actions/issues.ts`: `createIssueAction`, `updateIssueAction`, `deleteIssueAction`, `getIssueCountsAction`
- [ ] Harden `apps/devhub/src/actions/comments.ts`: alle comment CRUD actions
- [ ] Harden `apps/devhub/src/actions/review.ts` en `classify.ts` en `execute.ts`: per geraakte issue/project een access-check
- [ ] Harden `apps/devhub/src/actions/import.ts`: bij Userback sync alleen projecten verwerken waarvoor de triggering user toegang heeft (of: alleen admin mag sync draaien — kies en documenteer)
- [ ] Pas `apps/devhub/src/app/(app)/issues/[id]/page.tsx` aan: `assertProjectAccess` + `notFound()` bij error
- [ ] Pas `apps/devhub/src/app/(app)/page.tsx` aan: gebruik `listAccessibleProjectIds` + empty state voor 0 projecten
- [ ] Update `listIssues` in `packages/database/src/queries/issues.ts` voor `projectIds: string[]` filter (indien nog niet aanwezig)
- [ ] Update project-selector component: lijst alleen accessible projecten
- [ ] Integratietests: member zonder toegang → 404 op issue URL; member met toegang → normaal render
- [ ] Update `docs/specs/requirements-devhub.md` met SEC-154..160, FUNC-160, EDGE-150..151

## Acceptatiecriteria

- [ ] [SEC-154] Issue list toont alleen issues uit accessible projecten (geverifieerd voor member + admin)
- [ ] [SEC-155] Member navigeert naar `/issues/[id]` voor issue buiten toegang → HTTP 404
- [ ] [SEC-156] `createIssueAction` met `project_id` buiten toegang → `{ error: "Geen toegang tot dit project" }` en niets in DB
- [ ] [SEC-157] `updateIssueAction` door member op issue buiten toegang → retourneert "niet gevonden" error (niet "geen toegang")
- [ ] [SEC-158] Comments CRUD door member op issue buiten toegang → falen zonder effect in DB
- [ ] [SEC-159] Geen `issue_activity` rows worden aangemaakt voor geweigerde mutaties (geverifieerd via SQL count pre/post)
- [ ] [SEC-160] `getIssueCountsAction` voor projectID buiten toegang → error; sidebar toont 0 / hide
- [ ] [FUNC-160] Project-selector: admin ziet alle projecten; member ziet alleen toegewezen projecten
- [ ] [EDGE-150] HTTP-response status = 404 (niet 403) bij unauthorized issue access
- [ ] [EDGE-151] Member zonder rows → empty state met tekst, geen lege kale lijst
- [ ] Admins hebben toegang tot álle projecten zonder `devhub_project_access` rows (geverifieerd in integratietest)
- [ ] `npm run type-check` en `npm run lint` slagen

## Geraakt door deze sprint

- `apps/devhub/src/actions/issues.ts` (bijgewerkt)
- `apps/devhub/src/actions/comments.ts` (bijgewerkt)
- `apps/devhub/src/actions/classify.ts` (bijgewerkt)
- `apps/devhub/src/actions/execute.ts` (bijgewerkt)
- `apps/devhub/src/actions/review.ts` (bijgewerkt)
- `apps/devhub/src/actions/import.ts` (bijgewerkt)
- `apps/devhub/src/app/(app)/page.tsx` (bijgewerkt)
- `apps/devhub/src/app/(app)/issues/[id]/page.tsx` (bijgewerkt)
- `packages/database/src/queries/issues.ts` (bijgewerkt — `projectIds` filter)
- `apps/devhub/src/components/...project-selector.tsx` (bijgewerkt — check bestaand pad)
- `apps/devhub/src/components/...empty-state.tsx` (nieuw of uitgebreid)
- `docs/specs/requirements-devhub.md` (bijgewerkt)

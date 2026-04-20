# Query Inventory — Q2a Spike

**Status:** Q2b completed 2026-04-20. Resterende 7 calls (Server Components + auth-callbacks) staan in scope van Q2c.

**Datum:** 2026-04-20
**Sprint:** Q2a (spike, geen code-wijziging)
**Doel:** volledige lijst van alle directe Supabase-calls buiten `packages/database/`, plus beslissingen over client-scope-beleid, lint-tooling en scope van Q2b.
**Bron:** `grep -rn '\.from("'` en `grep -rn 'getAdminClient\|createClient'` in `apps/**`, exclusief `__tests__/` en `node_modules`.

---

## 0. Samenvatting (tl;dr)

- **Totaal directe `.from()`-calls in apps:** **40** (exclusief tests).
- **Verdeling:**
  - Cockpit actions: 24
  - Cockpit API routes + Server Components: 7
  - DevHub actions: 4
  - DevHub API routes + Server Components: 4
  - Portal: 1
- **Hotspots (bestanden met 3+ sequentiële calls):** `actions/team.ts` (10), `actions/meeting-pipeline.ts` (8), `actions/segments.ts` (3).
- **Belangrijkste bevinding:** het merendeel van de calls is eenvoudig te verplaatsen naar bestaande of nieuwe helpers. Drie flows vereisen aandacht:
  1. `reprocessMeetingAction` — park/restore-patroon over `meetings.update` (tx-aanname).
  2. `inviteUserAction` — upsert `profiles` + replace `devhub_project_access` (tx-aanname, ook in `updateUserAccessAction`).
  3. `regenerateMeetingAction` — delete segments + re-insert + embed (idempotent, maar multi-stap).
- **Beleid client-scope:** helpers krijgen een optionele `client?: SupabaseClient` parameter; caller geeft admin- of user-scoped client door. Geen impliciete `getAdminClient()` in helpers (behalve expliciet admin-only mutations).
- **Lint/check-tooling:** custom `scripts/check-no-direct-supabase.sh` in husky `pre-commit` (opt-in via `lint-staged` pad-filter). ESLint `no-restricted-syntax` als secundaire vangnet in CI.
- **Scope Q2b:** alle `.from()` calls in `apps/**/actions/**` + `apps/**/app/api/**`. Server Components (`page.tsx`, `layout.tsx`, auth-callback `route.ts`) in **Q2c** — dit vereist een helper-pattern voor `getProfileRoleForCurrentUser` dat eerst ontworpen moet worden.

---

## 1. Volledige call-tabel

Kolommen:

- **Locatie** — bestand:regel.
- **Locatie-type** — `action` (Server Action), `route` (API route), `page` (Server Component), `component` (Client Component).
- **Tabel** — Supabase-tabel.
- **Operatie** — `select` / `insert` / `update` / `upsert` / `delete`.
- **Client** — welke Supabase-client de call gebruikt (`admin` = service-role, `user` = cookie-scoped, `browser` = anon-key).
- **Hergebruik** — bestaande helper die matcht, of **NEW** wanneer een nieuwe helper nodig is.

### 1.1 Cockpit — Server Actions (24 calls)

| Locatie                           | Type   | Tabel                       | Op     | Client | Hergebruik                                         |
| --------------------------------- | ------ | --------------------------- | ------ | ------ | -------------------------------------------------- |
| `actions/email-filter.ts:45`      | action | `emails`                    | select | admin  | NEW `getEmailForPipelineInput(id)`                 |
| `actions/meeting-pipeline.ts:44`  | action | `meetings`                  | select | admin  | NEW `getMeetingForRegenerate(id)`                  |
| `actions/meeting-pipeline.ts:151` | action | `meetings`                  | select | admin  | NEW `getMeetingOrganizationId(id)`                 |
| `actions/meeting-pipeline.ts:157` | action | `meeting_project_summaries` | delete | admin  | NEW `deleteSegmentsByMeetingId(id)`                |
| `actions/meeting-pipeline.ts:252` | action | `meetings`                  | select | admin  | NEW `getMeetingForRegenerateRisks(id)`             |
| `actions/meeting-pipeline.ts:342` | action | `meetings`                  | select | admin  | NEW `getMeetingForReprocess(id)`                   |
| `actions/meeting-pipeline.ts:369` | action | `meetings`                  | update | admin  | NEW `parkMeetingForReprocess(id, parkedTitle)`     |
| `actions/meeting-pipeline.ts:380` | action | `meetings`                  | update | admin  | NEW `restoreParkedMeeting(id, firefliesId, title)` |
| `actions/meeting-pipeline.ts:424` | action | `meetings`                  | delete | admin  | hergebruik `deleteMeeting(id)` (bestaat)           |
| `actions/meetings.ts:229`         | action | `meeting_projects`          | select | admin  | NEW `listMeetingProjectIds(meetingId)`             |
| `actions/meetings.ts:230`         | action | `meeting_participants`      | select | admin  | NEW `listMeetingParticipantIds(meetingId)`         |
| `actions/segments.ts:41`          | action | `meeting_project_summaries` | select | admin  | NEW `getSegmentNameRaw(segmentId)`                 |
| `actions/segments.ts:53`          | action | `meetings`                  | select | admin  | hergebruik `getMeetingOrganizationId(id)`          |
| `actions/segments.ts:89`          | action | `projects`                  | select | admin  | NEW `getProjectAliases(projectId)`                 |
| `actions/team.ts:87`              | action | `profiles`                  | upsert | admin  | NEW `upsertProfile({id, email, role})`             |
| `actions/team.ts:95`              | action | `devhub_project_access`     | delete | admin  | NEW `clearProjectAccess(userId)`                   |
| `actions/team.ts:102`             | action | `devhub_project_access`     | insert | admin  | NEW `insertProjectAccess(rows)`                    |
| `actions/team.ts:107`             | action | `devhub_project_access`     | delete | admin  | hergebruik `clearProjectAccess(userId)`            |
| `actions/team.ts:142`             | action | `profiles`                  | update | admin  | NEW `updateProfileRole(userId, role)`              |
| `actions/team.ts:150`             | action | `profiles`                  | select | admin  | NEW `getProfileRole(userId)`                       |
| `actions/team.ts:154`             | action | `devhub_project_access`     | delete | admin  | hergebruik `clearProjectAccess(userId)`            |
| `actions/team.ts:156`             | action | `devhub_project_access`     | delete | admin  | hergebruik `clearProjectAccess(userId)`            |
| `actions/team.ts:159`             | action | `devhub_project_access`     | insert | admin  | hergebruik `insertProjectAccess(rows)`             |
| `actions/team.ts:203`             | action | `devhub_project_access`     | delete | admin  | hergebruik `clearProjectAccess(userId)`            |

### 1.2 Cockpit — API routes + Server Components (7 calls)

| Locatie                                         | Type  | Tabel                   | Op     | Client | Hergebruik                                                                                                                     |
| ----------------------------------------------- | ----- | ----------------------- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `app/api/email/reclassify/route.ts:62`          | route | `emails`                | select | admin  | NEW `listEmailsForReclassify({ limit, skipFiltered })`                                                                         |
| `app/api/ingest/backfill-sentences/route.ts:35` | route | `meetings`              | select | admin  | NEW `getMeetingForBackfill(id)`                                                                                                |
| `app/api/ingest/backfill-sentences/route.ts:61` | route | `meetings`              | update | admin  | NEW `updateMeetingRawFireflies(id, raw)` (bestaat in `mutations/meetings.ts` als `updateMeetingRawFireflies` — **hergebruik**) |
| `app/api/ingest/reprocess/route.ts:49`          | route | `meetings`              | select | admin  | NEW `getMeetingByFirefliesIdForReprocess(ff_id)` (of uitbreiden `getMeetingByFirefliesId`)                                     |
| `app/(dashboard)/admin/team/page.tsx:27`        | page  | `devhub_project_access` | select | admin  | NEW `listAllProjectAccess()` (nu inline in Server Component — **Q2c-scope**)                                                   |
| `app/(dashboard)/page.tsx:27`                   | page  | `profiles`              | select | user   | NEW `getProfileName(userId, client)` (**Q2c-scope**)                                                                           |
| `app/auth/callback/route.ts:43`                 | route | `profiles`              | select | user   | NEW `getProfileRoleForUser(userId, client)` (**Q2c-scope: auth-callback** — user-scoped)                                       |

### 1.3 DevHub — Server Actions (4 calls)

| Locatie                        | Type   | Tabel                  | Op     | Client | Hergebruik                                                       |
| ------------------------------ | ------ | ---------------------- | ------ | ------ | ---------------------------------------------------------------- |
| `actions/classify.ts:78`       | action | `projects`             | select | admin  | NEW `getProjectName(projectId)`                                  |
| `actions/issues.ts:199`        | action | `projects`             | select | admin  | hergebruik `getProjectName(projectId)`                           |
| `actions/slack-settings.ts:39` | action | `project_slack_config` | upsert | admin  | NEW `upsertSlackConfig({ projectId, webhookUrl, notifyEvents })` |
| `actions/slack-settings.ts:56` | action | `project_slack_config` | delete | admin  | NEW `deleteSlackConfig(projectId)`                               |

### 1.4 DevHub — API routes + Server Components (4 calls)

| Locatie                                 | Type  | Tabel                  | Op     | Client | Hergebruik                                                           |
| --------------------------------------- | ----- | ---------------------- | ------ | ------ | -------------------------------------------------------------------- |
| `app/(app)/settings/import/page.tsx:10` | page  | `projects`             | select | user   | NEW `getProjectByUserbackProjectId(ubId, client)` (**Q2c-scope**)    |
| `app/(app)/settings/slack/page.tsx:33`  | page  | `project_slack_config` | select | admin  | NEW `listSlackConfigsByProjectIds(ids)` (**Q2c-scope**)              |
| `app/api/ingest/userback/route.ts:36`   | route | `projects`             | select | admin  | hergebruik/NEW `getProjectByUserbackProjectId(ubId)` (admin-variant) |
| `app/auth/callback/route.ts:38`         | route | `profiles`             | select | user   | hergebruik `getProfileRoleForUser(userId, client)` (**Q2c-scope**)   |

### 1.5 Portal — API routes (1 call)

| Locatie                         | Type  | Tabel      | Op     | Client | Hergebruik                                                         |
| ------------------------------- | ----- | ---------- | ------ | ------ | ------------------------------------------------------------------ |
| `app/auth/callback/route.ts:40` | route | `profiles` | select | user   | hergebruik `getProfileRoleForUser(userId, client)` (**Q2c-scope**) |

---

## 2. Hergebruik-matrix

### 2.1 Bestaande helpers die al bruikbaar zijn (hergebruik, geen nieuwe helper nodig)

| Helper                                                         | Laag     | Wordt nu vervangen door directe call in                                                       |
| -------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `deleteMeeting(id)` — `mutations/meetings.ts`                  | mutation | `actions/meeting-pipeline.ts:424`                                                             |
| `updateMeetingRawFireflies(id, raw)` — `mutations/meetings.ts` | mutation | `app/api/ingest/backfill-sentences/route.ts:61`                                               |
| `getMeetingByFirefliesId(firefliesId)` — `queries/meetings.ts` | query    | `app/api/ingest/reprocess/route.ts:49` (variant met andere kolom-set — kan helper uitbreiden) |

### 2.2 Nieuwe helpers die toegevoegd moeten worden

Gegroepeerd per domein.

**`queries/meetings.ts`** (nieuw):

- `getMeetingForRegenerate(id)` — join met `meeting_participants(person:people(name))`
- `getMeetingForRegenerateRisks(id)` — zelfde + `raw_fireflies`
- `getMeetingForReprocess(id)` — slank: `id, fireflies_id, title`
- `getMeetingForBackfill(id)` — `id, fireflies_id, raw_fireflies`
- `getMeetingOrganizationId(id)` — mini-query, 1 kolom
- `listMeetingProjectIds(meetingId)` — uit `meeting_projects`
- `listMeetingParticipantIds(meetingId)` — uit `meeting_participants`

**`mutations/meetings.ts`** (nieuw):

- `parkMeetingForReprocess(id, parkedTitle)` — update met `fireflies_id=null`
- `restoreParkedMeeting(id, firefliesId, title)` — restore na crash
- `deleteSegmentsByMeetingId(meetingId)` — uit `meeting_project_summaries`

**`queries/projects.ts`** (nieuw):

- `getProjectName(projectId)` — 1 kolom, gebruikt in Slack-notifs
- `getProjectAliases(projectId)` — 1 kolom, gebruikt in segment-linking
- `getProjectByUserbackProjectId(ubId, client?)` — user- én admin-scoped

**`queries/emails.ts`** (nieuw):

- `getEmailForPipelineInput(id)` — velden nodig voor `processEmail`
- `listEmailsForReclassify({ limit, skipFiltered })` — met `.or()` filter

**`queries/team.ts`** (nieuw):

- `getProfileRole(userId, client?)` — user- of admin-scoped
- `getProfileName(userId, client?)` — voor dashboard-greeting
- `getProfileRoleForUser(userId, client)` — auth-callback helper (expliciet user-scoped)
- `listAllProjectAccess(client?)` — voor admin team-pagina

**`mutations/team.ts`** (nieuw bestand — bestaat nog niet):

- `upsertProfile({ id, email, role })`
- `updateProfileRole(userId, role)`
- `clearProjectAccess(userId)`
- `insertProjectAccess(rows)`

**`mutations/slack-config.ts`** (nieuw bestand):

- `upsertSlackConfig({ projectId, webhookUrl, notifyEvents })`
- `deleteSlackConfig(projectId)`

**`queries/slack-config.ts`** (nieuw bestand):

- `listSlackConfigsByProjectIds(projectIds, client?)`

**`queries/meeting-project-summaries.ts`** (uitbreiden):

- `getSegmentNameRaw(segmentId)` — 1 kolom

---

## 3. Transactie-audit

Supabase JS-client heeft **geen client-side transactie-API**. Twee opties voor atomiciteit:

- **`supabase.rpc('fn_name', {...})`** — Postgres-functie die de hele flow server-side in één transactie uitvoert.
- **Best-effort compensating actions** — als tx niet kritisch is (idempotent of reversibel), accepteer meerdere calls en bouw herstellogica.

### 3.1 `reprocessMeetingAction` — `meeting-pipeline.ts:327-438`

**Flow:**

1. Fetch meeting (`select`) → 342
2. Fetch transcript van Fireflies (external API, geen DB)
3. Park old meeting (`update` — clear fireflies_id + prefix title) → 369
4. Run volledige pipeline (Fireflies → Gatekeeper → Summarizer → Extractor → embed)
5. Bij success: delete parked meeting → 424
6. Bij failure: `restoreOldMeeting()` → 380

**Tx-aanname:** stap 3 moet succesvol zijn voordat stap 4 begint (unique-constraints op `fireflies_id` en `(lower(title), date)`). Bij crash tussen 3 en 4 blijft de meeting in "parked"-state.

**Beoordeling:** de flow heeft al een compensating action (`restoreOldMeeting`). Geen RPC nodig — Q2b verplaatst alleen de `.from()`-calls naar helpers; de flow blijft zoals-is. Wel aanbeveling: voeg een `restoreParkedMeeting(id, firefliesId, title)` mutation toe zodat het park/restore-contract helder is.

**Beslissing:** **geen RPC vereist.** Wel nieuwe helpers.

### 3.2 `inviteUserAction` / `updateUserAccessAction` — `team.ts:40-167`

**Flow `inviteUserAction`:**

1. `admin.auth.admin.listUsers()` (auth, geen `from()`)
2. `admin.auth.admin.inviteUserByEmail()` (auth)
3. `profiles.upsert({ id, email, role })` → 87
4. `devhub_project_access.delete(eq profile_id)` → 95
5. `devhub_project_access.insert(rows)` → 102

**Flow `updateUserAccessAction`:**

1. `profiles.update({ role })` → 142
2. `profiles.select('role')` (re-read effectieve rol) → 150
3. `devhub_project_access.delete` → 154/156
4. `devhub_project_access.insert` → 159

**Tx-aanname:** wanneer stap 4 faalt na stap 3 heeft de user _geen_ project-access meer — access is "gereset maar niet opnieuw ingesteld". Dit is een degraded state, maar niet catastrofaal: een admin kan `updateUserAccessAction` opnieuw draaien.

**Beoordeling:** de code heeft al early-returns met `{ error }` bij elke stap. Echte atomiciteit zou via RPC kunnen, maar **de huidige "delete dan insert"-pattern is acceptabel** (kort, geen kruisende writes, retry-safe).

**Beslissing:** **geen RPC in Q2b.** Wel een `replaceProjectAccess(userId, projectIds)` helper die delete + insert encapsuleert — dan is de tx-grens in elk geval één helper-call voor de caller.

### 3.3 `regenerateMeetingAction` — `meeting-pipeline.ts:29-224`

**Flow:**

1. Fetch meeting + participants (`select`) → 44
2. (AI-calls, geen DB)
3. `updateMeetingSummary` (via helper) + `updateMeetingTitle` (via helper)
4. `runRiskSpecialistStep` (interne DB-writes naar `extractions`)
5. Fetch organization_id (`select`) → 151
6. Delete old segments (`delete`) → 157
7. Insert new segments (via helper `insertMeetingProjectSummaries`)
8. `updateSegmentEmbedding` per segment
9. `markMeetingEmbeddingStale` (via helper)

**Tx-aanname:** flow is **idempotent** (stap 6 + 7 vormen een "delete-insert-replace"). Tussentijdse crash → segments kunnen leeg zijn, maar volgende run herstelt dit.

**Beoordeling:** geen RPC nodig. Wel helpers toevoegen voor stap 1, 5, 6 (de laatste = `deleteSegmentsByMeetingId`).

### 3.4 Conclusie

**Geen enkele flow vereist een RPC in Q2b.** Alle transacties zijn óf idempotent óf hebben al compensating actions. Q2b kan zich beperken tot mechanische verplaatsing naar helpers.

---

## 4. Beleid client-scope (candidate tekst voor `packages/database/README.md`)

### 4.1 Observaties huidige codebase

- **Veel bestaande queries accepteren al een optionele `client?: SupabaseClient` parameter.** Voorbeelden: `listTeamMembers(client?)`, `countAdmins(client?)`, `getReviewQueueCount(client?)`, `listDraftMeetings(client?)`. Dit is het dominante pattern voor queries die zowel in Server Components (user-scoped) als server-side batch-jobs (admin) gebruikt worden.
- **Mutations zijn vaak admin-only hardcoded.** Voorbeelden: `insertAgentRun`, `insertMeeting` — die roepen intern `getAdminClient()` aan (nog niet geverifieerd, maar gangbaar patroon).
- **De 40 directe `.from()`-calls in apps gebruiken bijna uitsluitend `getAdminClient()`** — uitzondering: de 6 user-scoped calls in auth-callbacks + dashboard-greeting + devhub settings-pagina.

### 4.2 Beleid (voorstel, definitief na review)

> **Alle queries en mutations in `packages/database/` accepteren een optionele laatste parameter `client?: SupabaseClient`. Wanneer de caller geen client meegeeft valt de helper terug op `getAdminClient()`.**
>
> - **Caller = Server Component met user-context:** geef `await createClient()` door. De helper respecteert dan RLS.
> - **Caller = Server Action / API route met admin-context:** geef niets door, of expliciet `getAdminClient()`. De helper bypassed dan RLS (service-role).
> - **Caller = cron / pipeline / seed:** geef niets door. Default admin.
> - **Uitzondering:** helpers die inherent admin-privileges vereisen (`auth.admin.*`, secrets-mutaties) accepteren geen `client`-parameter — ze gebruiken altijd `getAdminClient()` intern. Documenteer dit met een JSDoc-regel `@admin-only`.

### 4.3 Signatuur-voorbeeld

```ts
// queries/team.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export async function getProfileRole(
  userId: string,
  client?: SupabaseClient,
): Promise<"admin" | "member" | "client" | null> {
  const db = client ?? getAdminClient();
  const { data } = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
  return (data?.role as "admin" | "member" | "client" | null) ?? null;
}
```

### 4.4 Motivatie

- **Geen impliciete escalatie van privileges** — caller blijft verantwoordelijk voor client-keuze.
- **Hergebruik tussen Server Components en pipelines zonder duplicatie.**
- **Typechecking** — `SupabaseClient` type komt uit `@supabase/supabase-js`; helpers werken met beide varianten.

---

## 5. Lint/check tooling — keuze

### 5.1 Opties

**Optie A — Custom ESLint-regel (`no-restricted-syntax` of custom plugin).**

- Voors: geeft realtime feedback in editor (VS Code), integreert met `eslint --fix`, werkt met bestaande `npm run lint`.
- Tegens: `eslint.config.mjs` is nu minimaal (alleen prettier). `apps/cockpit/eslint.config.mjs` gebruikt wel `eslint-config-next`. Een regel schrijven die "`.from(` in `apps/**` maar niet in `packages/database/**`" detecteert vereist een custom plugin of een slimme `no-restricted-syntax`-pattern.
- Complexiteit: middel — AST-match op `.from()` call-expressie + pad-filter.

**Optie B — Bash script `scripts/check-no-direct-supabase.sh` in husky `pre-commit` + CI.**

- Voors: triviaal te schrijven (50 regels `rg`/`grep`). Geen ESLint-config-uitbreiding. Werkt al voor andere "niet-toegestane patronen" in codebases.
- Tegens: alleen bij commit/CI, geen editor-feedback. Minder granulair dan AST (kan false-positives geven op bv. `.from(buffer)`).
- Complexiteit: laag.

**Optie C — Husky pre-commit alleen (geen CI), grep-only.**

- Voors: simpel.
- Tegens: commit met `--no-verify` omzeilt de check. Geen CI-vangnet.
- Complexiteit: laag.

### 5.2 Keuze

**Optie B** — bash-script in husky `pre-commit` + dezelfde script gedraaid in CI (via een nieuw `npm run check:queries` dat ook in `turbo.json` hangt).

**Redenen:**

1. Het project heeft al een custom husky `pre-commit`-hook die vergelijkbaar werk doet (dep-graph regeneratie). Een tweede check in hetzelfde hook-bestand is natuurlijk.
2. De codebase-owner is een non-coder; een bash-script is zichtbaarder en makkelijker te debuggen dan een ESLint-rule in JS/TS.
3. `rg --type ts --glob '!__tests__'` filtert al betrouwbaar genoeg; false-positives zijn niet bestraffend (we hebben controle over de codebase).
4. Optie A kan later toegevoegd worden als pure editor-DX-bonus zonder deze check te vervangen.

### 5.3 Script-skeleton (voorstel Q2b)

```bash
#!/usr/bin/env bash
# scripts/check-no-direct-supabase.sh
set -e
FORBIDDEN_DIRS=(apps/cockpit/src/actions apps/devhub/src/actions apps/portal/src/actions apps/cockpit/src/app/api apps/devhub/src/app/api apps/portal/src/app/api)

HITS=$(rg -n --type ts --type tsx '\.from\("' "${FORBIDDEN_DIRS[@]}" 2>/dev/null | grep -v '__tests__' || true)

if [ -n "$HITS" ]; then
  echo "FOUT: directe Supabase .from()-calls gevonden buiten packages/database/:"
  echo "$HITS"
  echo ""
  echo "Verplaats naar packages/database/queries/ of packages/database/mutations/."
  exit 1
fi
```

Werking:

- Draait alleen op **actions + API routes** (Q2b-scope). Pages/Server Components komen pas in **Q2c** onder de check.
- Exit-code 1 blokkeert commit én CI.

---

## 6. Parse-helpers inventaris

### 6.1 Gevonden parsers

Grep `^function (parse|normalize|coerce|resolve)[A-Z]` in `apps/`:

| Locatie                                                               | Helper                             | Doel                                     | Shape                 |
| --------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------- | --------------------- |
| `apps/cockpit/src/app/(dashboard)/emails/page.tsx:21`                 | `parseDirection(value)`            | searchParam → `"incoming" \| "outgoing"` | narrow string-literal |
| `apps/cockpit/src/app/(dashboard)/emails/page.tsx:25`                 | `parseFilterStatus(value)`         | searchParam → `"kept" \| "filtered"`     | narrow string-literal |
| `apps/cockpit/src/components/administratie/administratie-tabs.tsx:16` | `normalizeTab(value)`              | tab-waarde normalizeren                  | narrow string-literal |
| `apps/cockpit/src/components/clients/add-organization-button.tsx:15`  | `parseDomains(input)`              | string → `string[]`                      | split + trim          |
| `apps/cockpit/src/components/shared/pipeline-info.tsx:12`             | `parsePipelineSteps(rawFireflies)` | JSON blob → structured steps             | pipeline-specifiek    |
| `apps/portal/src/app/(app)/projects/[id]/issues/page.tsx:9`           | `parseFilter(raw)`                 | searchParam → `PortalStatusKey \| null`  | narrow string-literal |

### 6.2 Soortgelijk patroon: Zod searchParam-schema

Voorbeeld `apps/devhub/src/app/(app)/issues/page.tsx:19-27`:

```ts
const issueSearchParamsSchema = z.object({
  project: z.string().uuid().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  sort: z.enum(ISSUE_SORTS).optional(),
  page: z.coerce.number().int().min(1).optional(),
});
```

Dit is een **betere** variant: Zod geeft type-veiligheid, coercion en validatie in één.

### 6.3 Scope-vraag: alleen emails, of algemener?

**Aanbeveling:** **niet** generiek centraliseren in Q2. De bestaande parse-helpers zijn:

1. **Page-specifiek** — weinig hergebruik tussen pages (elke page heeft z'n eigen set van toegestane waarden).
2. **Klein** — 3-5 regels per helper, geen duplicatie waard om te extraheren.
3. **Niet-DB** — valt buiten Q2-doel (query-centralisatie).

**Wel:** in Q2b of een vervolg-sprint de 2 parsers in `emails/page.tsx` **vervangen door een Zod-schema** (consistent met `issues/page.tsx`). Dit is een losse refactor, geen blokkade.

---

## 7. Scope-beslissingen

### 7.1 Zijn API routes in scope voor Q2b?

**Ja.** Argumenten:

- **Pro:** API routes zijn functioneel identiek aan Server Actions — ze muteren en lezen data; dezelfde regel ("geen directe `.from()`") hoort er te gelden.
- **Pro:** er zijn maar **4 API-route calls** in scope (2 in cockpit ingest + 1 in devhub userback + 1 email reclassify + de auth-callbacks vallen apart). Overzichtelijk.
- **Con:** geen. Eén inconsistentie-argument ("API routes zijn apart") zou juist een reden zijn om ze **wel** mee te nemen.

**Beslissing Q2b-scope:**

- `apps/*/src/actions/**/*.ts`
- `apps/*/src/app/api/**/*.ts` (API routes)

### 7.2 Zijn Server Components in scope?

**Nee — aparte sprint Q2c.** Argumenten:

- **Con (Q2b-scope):** Server Components gebruiken user-scoped `createClient()` (RLS actief). Deze vereisen een expliciet `client`-parameter-contract in de helpers, wat meer ontwerp vraagt dan een mechanische verplaatsing.
- **Con:** aparte helpers voor `profile-role-fetch-in-auth-callback` en `getProfileName-for-greeting` zijn net andere use-cases dan de admin-flows.
- **Con:** Server Components / `layout.tsx`-auth-checks zijn een losstaand patroon — beter in één sprint samen uitzoeken.
- **Pro:** maar 7 calls in cockpit + 4 in devhub + 1 in portal = **12 Server Component / auth-callback calls**. Past makkelijk in een aparte sprint.

**Beslissing:** **Q2c** (nieuwe sprint, te plannen na Q2b). Scope: Server Components (`page.tsx`, `layout.tsx`) + auth-callback `route.ts`-bestanden. Output: `getProfileRoleForUser`, `getProfileName`, `getProjectByUserbackProjectId` (user-variant), `listAllProjectAccess`, `listSlackConfigsByProjectIds`, `getMeetingByFirefliesIdForReprocess` variant.

### 7.3 Definitieve scope voor Q2b (33 calls)

| Laag               | Aantal | Bron                                                    |
| ------------------ | ------ | ------------------------------------------------------- |
| Cockpit actions    | 24     | sectie 1.1                                              |
| Cockpit API routes | 4      | reclassify:62 + backfill-sentences:35,61 + reprocess:49 |
| DevHub actions     | 4      | sectie 1.3                                              |
| DevHub API routes  | 1      | userback:36                                             |
| **Totaal Q2b**     | **33** |                                                         |

### 7.4 Definitieve scope voor Q2c (7 calls — toekomstige sprint)

| Laag                      | Aantal | Bron                                   |
| ------------------------- | ------ | -------------------------------------- |
| Cockpit Server Components | 2      | admin/team:27 + dashboard/page:27      |
| Cockpit auth-callback     | 1      | auth/callback:43                       |
| DevHub Server Components  | 2      | settings/import:10 + settings/slack:33 |
| DevHub auth-callback      | 1      | auth/callback:38                       |
| Portal auth-callback      | 1      | auth/callback:40                       |
| **Totaal Q2c**            | **7**  |                                        |

Check: 33 + 7 = 40 = totaal uit sectie 0. ✓

---

## 8. Q2b — afgeleide taaklijst

Op basis van deze inventaris opent Q2b met de volgende concrete lijst:

1. **Nieuwe helpers maken** (per bestand gegroepeerd):
   - Extend `packages/database/src/queries/meetings.ts` — 7 nieuwe queries.
   - Extend `packages/database/src/mutations/meetings.ts` — 3 nieuwe mutations.
   - Extend `packages/database/src/queries/projects.ts` — 3 nieuwe queries.
   - Extend `packages/database/src/queries/emails.ts` — 2 nieuwe queries.
   - Extend `packages/database/src/queries/team.ts` — 4 nieuwe queries.
   - New `packages/database/src/mutations/team.ts` — 4 nieuwe mutations.
   - New `packages/database/src/mutations/slack-config.ts` — 2 nieuwe mutations.
   - New `packages/database/src/queries/slack-config.ts` — 1 nieuwe query (Q2c).
   - Extend `packages/database/src/queries/meeting-project-summaries.ts` — 1 nieuwe query.
   - Extend `packages/database/src/mutations/meeting-project-summaries.ts` — `deleteSegmentsByMeetingId` al aanwezig? zo niet: toevoegen.

2. **33 call-sites verplaatsen** conform sectie 1.1 / 1.2 (API) / 1.3 / 1.4 (API) — zie hergebruik-kolom.

3. **`scripts/check-no-direct-supabase.sh` toevoegen** + opnemen in `.husky/pre-commit` + `package.json` als `npm run check:queries`.

4. **`packages/database/README.md` schrijven/updaten** met de client-scope-beleidstekst uit sectie 4.2.

5. **Validatie:**
   - `npm run type-check` slaagt.
   - `npm run lint` slaagt.
   - `npm test` slaagt.
   - `scripts/check-no-direct-supabase.sh` geeft 0 hits.

---

## 9. Afronding Q2a

- [x] Volledige grep-inventaris (sectie 1).
- [x] Categorisering per locatie-type, tabel, operatie, client-scope (sectie 1).
- [x] Bestaande helpers in kaart (sectie 2.1).
- [x] Hergebruik-matrix (sectie 2).
- [x] Transactie-audit (sectie 3).
- [x] Beleid client-scope (sectie 4).
- [x] Keuze lint/check-tooling (sectie 5).
- [x] Parse-helpers-inventaris (sectie 6).
- [x] Scope-beslissingen (sectie 7): Q2b = actions + API routes, Q2c = Server Components + auth-callbacks.
- [x] Q2b-taaklijst (sectie 8).

**Getal "N directe calls" staat vast: 40 (Q2b = 33, Q2c = 7). Q2b opent niet meer ter discussie.**

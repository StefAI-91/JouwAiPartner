# Micro Sprint CC-001: Cockpit Inbox + PM-review-gate

## Doel

Bouw de eerste werkende helft van de Customer-Communication-vision: een cross-project Cockpit-inbox waarin de PM (a) inkomende klant- en eindgebruiker-feedback endorseert vóór die de DevHub-backlog raakt, en (b) op `client_questions` kan antwoorden namens het team. Vanaf nu staan portal/widget/Userback-issues default op de nieuwe status `needs_pm_review` en zijn ze onzichtbaar in DevHub-triage tot een PM ze expliciet doorzet.

Dit is sprint 1 van 5 (CC-001 t/m CC-005) afgeleid uit `docs/specs/vision-customer-communication.md` §12.

## Vision-alignment

- `docs/specs/vision-customer-communication.md` **§3** — Inbox model: één DB, twee views (cockpit + portal). Cockpit krijgt nu een globale inbox in de sidebar.
- **§5** — Inbound feedback flow met PM-endorsement-gate: vier acties (endorse / decline / defer / convert-to-qa) + drie nieuwe statussen (`needs_pm_review`, `declined`, `deferred`) plus de optionele `converted_to_qa`.
- **§6** — Two-way messaging: `replyToQuestion` accepteert `role: "team"` al; alleen UI ontbreekt.
- **§9** — UX-principe "status-first sorting" in de inbox-lijst.

## Afhankelijkheden

- `docs/specs/vision-customer-communication.md` (input).
- **PR-022** (`supabase/migrations/20260430110000_client_questions.sql`) — DB-tabel + RLS + `replyToQuestion` mutation in `packages/database/src/mutations/client-questions.ts:104-172`.
- **PR-023** — portal-side reply UI als visuele referentie: `apps/portal/src/components/inbox/{question-card,question-list,client-reply-form}.tsx`.
- Bestaande `issues`-tabel + status-flow (constraint `chk_issues_status` in `supabase/migrations/20260409100005_devhub_quality_fixes.sql:35-36`).
- Bestaande inbound-paden:
  - portal: `apps/portal/src/actions/feedback.ts:58`
  - widget: `packages/database/src/mutations/widget/feedback.ts:39`
  - Userback: bestaande imports blijven `triage` (geen backfill — zie Risico's).
- `listAccessibleProjectIds` in `packages/auth/src/access.ts:147` (al gebruikt in `packages/database/src/queries/projects/access.ts:24`).

## Open vragen vóór start

1. **`converted_to_qa` mee in CC-001 of doorschuiven naar CC-005?** Aanbeveling: **mee in CC-001**. Klein extra werk (één extra mutation + één FK-kolom). Het scheelt later een tweede DB-migratie en houdt vision §5-tabel consistent. CC-001 levert een minimale modal met body-textarea — rich edit, due-date, topic-link komen in CC-005.
2. **Zijn `declined` en `deferred` "closed" voor `CLOSED_STATUSES`?** Aanbeveling: `declined` ja (eind-status, klant ziet eindverklaring) + `converted_to_qa` ja (dood-end met FK), `deferred` nee (parked, kan terug). Bevestigen vóór constants-edit.
3. **RLS op cross-project query**: cockpit-inbox toont alle `needs_pm_review` issues over alle accessible projecten. Aanbeveling: **gebruik `listAccessibleProjectIds(profile.id, supabase)`** als filter (consistent met DevHub-pattern op `apps/devhub/src/app/(app)/issues/page.tsx`). Geen `getAdminClient()` shortcut.
4. **Sidebar-positie van Inbox?** Aanbeveling: **tweede positie in `primaryNavItems`, vóór Intelligence**. De Inbox is een dagelijks-aandacht-oppervlak (zoals een email-inbox); Intelligence/Review/Projects zijn analyse-tooling. Met badge-counter rechts wordt Inbox het natuurlijke startpunt. Niet in `secondaryNavItems` ("Bronnen") — daar zitten read-only ingestion-views (Meetings, Emails); Inbox is een actie-oppervlak.
5. **Decline-reason UI: modal of inline?** Aanbeveling: **modal**. Decline = belangrijke actie met irreversible gevolgen voor klant-relatie; verdient een focus-moment. Modal heeft textarea (min 10 chars), placeholder met voorbeeld-reasons ("scope-creep", "duplicate van #123", "niet realiseerbaar binnen budget"), en preview van wat klant zal zien. Niet inline — te makkelijk per ongeluk te triggeren. Convert volgt hetzelfde modal-patroon (textarea voor verhelderingsvraag).
6. **Status-naming: `converted_to_qa` of korter?** Aanbeveling: **houden zoals het is**. Lang maar zelf-documenterend. CHECK-constraint kosten zijn nul, en je leest 't bijna nooit zonder context.

## Taken

Bouw-volgorde **database → constants/types → query → mutations → validations → cockpit feature → ingestion-flip → registry → tests**. Wijk niet af; één laag verkeerd = downstream-typing breekt.

### 1. Database-migratie

Nieuwe migratie: `supabase/migrations/20260502100000_cc001_pm_review_gate.sql`.

- `ALTER TABLE issues DROP CONSTRAINT IF EXISTS chk_issues_status;`
- `ALTER TABLE issues ADD CONSTRAINT chk_issues_status CHECK (status IN ('needs_pm_review','triage','backlog','todo','in_progress','done','cancelled','declined','deferred','converted_to_qa'));`
- `ALTER TABLE issues ADD COLUMN IF NOT EXISTS decline_reason text;`
- `ALTER TABLE issues ADD COLUMN IF NOT EXISTS converted_to_question_id uuid REFERENCES client_questions(id) ON DELETE SET NULL;`
- `CREATE INDEX IF NOT EXISTS idx_issues_status_pm_review ON issues(status) WHERE status = 'needs_pm_review';` (partial index — cockpit-inbox query hit 'm continu)
- Comment-blok dat per status uitlegt waar hij thuishoort.

> **Belangrijk:** GEEN backfill van bestaande issues. Zie Risico's.

### 2. Constants & types

`packages/database/src/constants/issues.ts`:

- Voeg toe aan `ISSUE_STATUSES` (regel 13-21): `'needs_pm_review'`, `'declined'`, `'deferred'`, `'converted_to_qa'`.
- Voeg labels toe aan `ISSUE_STATUS_LABELS` (regel 49-56): `needs_pm_review: "Wacht op PM-review"`, `declined: "Afgewezen"`, `deferred: "Later"`, `converted_to_qa: "Omgezet naar vraag"`.
- Update `CLOSED_STATUSES` (regel 39): blijft een `Set<IssueStatus>` — voeg `'declined'` en `'converted_to_qa'` toe via `new Set<IssueStatus>(["done", "cancelled", "declined", "converted_to_qa"])`. `'deferred'` blijft buiten. **Niet** veranderen naar `as const`-array (bestaande consumers gebruiken `.has()`).
- Update `PORTAL_STATUS_GROUPS` (regel 97-122):
  - `ontvangen` → `["needs_pm_review", "triage"]` (klant ziet "Ontvangen" zowel vóór als na endorsement; PM-internal language lekt niet)
  - `afgerond` → `["done", "cancelled", "declined", "converted_to_qa"]`
  - Nieuwe groep `parked` → `["deferred"]`, label "Later"
- Regenereer Supabase-types via projectstandaard (`npm run types` of `supabase gen types`; check `package.json`).

### 3. Queries — nieuw bestand

**Cluster-vs-flat:** flat — één coherent domein, verwacht <200 regels met 2 exports. Pad: `packages/database/src/queries/inbox.ts`.

Exports:

- `listInboxItemsForTeam(profileId, supabase)` → `Promise<InboxItem[]>` waar `InboxItem` een discriminated union is:

  ```ts
  type InboxItem =
    | { kind: "feedback"; issue: IssueRow }
    | { kind: "question"; question: ClientQuestionListRow };
  ```

  Strategy:
  1. `listAccessibleProjectIds(profileId, supabase)` (uit `@repo/auth/access:147`) → array van project-ids.
  2. Twee parallelle SELECTs (geen SQL UNION — verlaagt typing-precisie):
     - `issues` waar `project_id IN (...)` AND `status IN ('needs_pm_review','deferred')`, sorteer op `created_at DESC`.
     - `client_questions` waar `project_id IN (...)` AND `status='open'` AND `parent_id IS NULL`, met embed `replies:client_questions!parent_id (id, body, sender_profile_id, created_at)`, sorteer op `created_at DESC`.
  3. Merge → status-first sorted (needs_pm_review > question-open > deferred), dan `created_at DESC`.

- `countInboxItemsForTeam(profileId, supabase)` → `Promise<{ pmReview: number; openQuestions: number; deferred: number }>`. Drie `count: 'exact', head: true` calls (geen rows ophalen).

### 4. Mutations — nieuw bestand

Pad: `packages/database/src/mutations/issues/pm-review.ts` (nieuw, naast `core.ts`). Update `mutations/issues/index.ts` met `export * from "./pm-review";`.

Exports — alle vier accepteren `client?: SupabaseClient` (default admin per CLAUDE.md client-scope-policy) én een `actorId: string` (zodat audit-events later zonder signature-break gewired kunnen worden):

- `endorseIssue(id, actorId, client?)` → `update issues set status='triage', updated_at=now() where id=$1 and status='needs_pm_review'`. Defensieve status-guard voorkomt dubbel-endorseren.
- `declineIssue(id, actorId, declineReason, client?)` → `status='declined', decline_reason=$reason, closed_at=now()`.
- `deferIssue(id, actorId, client?)` → `status='deferred'`.
- `convertIssueToQuestion(id, actorId, body, client?)`:
  1. Lookup issue (`project_id`, `organization_id`).
  2. Insert `client_questions` row (`parent_id=null`, `body=$body`, `sender_profile_id=actorId`, `issue_id=$issueId`).
  3. Update issue: `status='converted_to_qa'`, `converted_to_question_id=$newQuestionId`, `closed_at=now()`.

  Geen transactiewrapper (consistent met `replyToQuestion`-comments regels 98-102) — gedeeltelijk falen is corrigeerbaar. Wel return-error-early bij elke step.

`insertIssue` (`packages/database/src/mutations/issues/core.ts:65-87`) **hoeft niet** te wijzigen: `data.status` is al optioneel input. Callers gaan expliciet `status: "needs_pm_review"` meegeven (taak 9).

### 5. Validations

`packages/database/src/validations/issues.ts` (bestaand) — voeg toe:

```ts
pmReviewActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("endorse"), issueId: zUuid }),
  z.object({
    action: z.literal("decline"),
    issueId: zUuid,
    declineReason: z.string().min(10).max(1000),
  }),
  z.object({ action: z.literal("defer"), issueId: zUuid }),
  z.object({
    action: z.literal("convert"),
    issueId: zUuid,
    questionBody: z.string().min(10).max(2000),
  }),
]);
```

`min(10)` op `declineReason` omdat een lege/eenwoord-reason naar de klant geen verklaring is — vision §5 "Decline UX".

`replyToQuestionSchema` in `packages/database/src/validations/client-questions.ts:41-45` — **ongewijzigd hergebruiken** voor cockpit-reply.

### 6. Cockpit feature — `apps/cockpit/src/features/inbox/`

Nieuwe folder, structuur volgt `apps/cockpit/src/features/review/`:

```
apps/cockpit/src/features/inbox/
├── README.md
├── actions/
│   ├── pm-review.ts              # endorse/decline/defer/convert acties
│   └── replies.ts                # replyToQuestionAsTeamAction
├── components/
│   ├── inbox-page.tsx            # composition-root
│   ├── inbox-list.tsx            # status-grouped lijst
│   ├── inbox-item-card.tsx       # één rij in de lijst
│   ├── feedback-action-panel.tsx # vier knoppen + decline-reason modal
│   ├── cockpit-reply-form.tsx    # mirror van portal client-reply-form
│   └── empty-state.tsx
└── validations/
    └── pm-review.ts              # re-export pmReviewActionSchema voor scoping
```

**Per file:**

- **`actions/pm-review.ts`** — vier server-actions, allemaal:
  1. `parsed = pmReviewActionSchema.safeParse(input)` → fail-fast.
  2. Auth: cockpit-pattern (`createClient` + `getCurrentProfile`).
  3. Roep mutation aan met `parsed.data` + `profile.id` als actorId.
  4. Revalideer `/inbox`.
  5. Return `{ success: true }` of `{ error }`.

- **`actions/replies.ts`** — `replyToQuestionAsTeamAction(input)`:
  - Mirror van `apps/portal/src/actions/inbox.ts:26-58`, maar `role: "team"` en geen portal-access-check (cockpit is team).
  - Roept `replyToQuestion(parsed.data, { profile_id, role: "team" }, supabase)`.
  - Revalideer `/inbox`.

- **`components/inbox-page.tsx`** — server component, laadt `listInboxItemsForTeam(profile.id, supabase)` + `countInboxItemsForTeam`, rendert headline-counters + `<InboxList items={...}>`.

- **`components/inbox-list.tsx`** — gegroepeerde rendering volgens vision §9 status-first principe:

  ```ts
  // Bron van waarheid voor sectie-volgorde — bewaar in dit bestand, niet
  // duplicaten in styling of card-component.
  const ATTENTION_ORDER = [
    "needs_pm_review", // klant-feedback wacht op PM-actie
    "open", // open client_questions wacht op team-antwoord
    "deferred", // geparkeerd, herinnert dat 't er staat
    "responded", // klant heeft net geantwoord
  ] as const;
  ```

  - Sectie **"Wacht op jou"** — `needs_pm_review` + open `questions` zonder team-reply.
  - Sectie **"Wacht op klant"** — open `questions` mét team-reply (NB: `client_questions.status` blijft `'open'` ook ná team-reply; alleen client-reply flipt 'm naar `'responded'` per regel 152-169 in `client-questions.ts`).
  - Sectie **"Geparkeerd"** — `deferred`.
  - Per item: `<InboxItemCard>`.

- **`components/inbox-item-card.tsx`** — discriminated render op `kind`: feedback → titel + source-badge + `<FeedbackActionPanel>`; question → thread-preview + `<CockpitReplyForm>`.

- **`components/feedback-action-panel.tsx`** — client-component:
  - Vier knoppen: "Endorse → triage", "Decline", "Defer", "Convert naar vraag".
  - Endorse + Defer: directe action-call.
  - Decline: opent inline modal met required textarea (min 10 chars), submit roept `declineIssueAction`.
  - Convert: opent modal met textarea voor vraag-body, submit roept `convertIssueAction`.
  - `useTransition` + lokale optimistic state + error-rendering (mirror `client-reply-form` pattern).

- **`components/cockpit-reply-form.tsx`** — kopie van `apps/portal/src/components/inbox/client-reply-form.tsx` met drie wijzigingen: andere action import (`replyToQuestionAsTeamAction`), label "Antwoord namens team", geen `projectId` prop nodig (mutation derived).

- **`README.md`** — feature-template per CLAUDE.md regel 199. Menu per laag (actions / components / validations) + bullet "AI-draft button (vision §6 Phase 2) is GEEN onderdeel van CC-001".

### 7. Cockpit-route + sidebar

- `apps/cockpit/src/app/(dashboard)/inbox/page.tsx` (server component, render `<InboxPage />`) + `loading.tsx` + `error.tsx`.
- `apps/cockpit/src/lib/constants/navigation.ts`:
  - **Regel 18:** breidt `NavItem.badgeKey` type uit van `"reviewCount"` naar `"reviewCount" | "inboxCount"`.
  - **Regel 22-29:** voeg toe in `primaryNavItems` als **tweede item, ná Home en vóór Intelligence**: `{ href: "/inbox", label: "Inbox", icon: Inbox, badgeKey: "inboxCount" }` (`Inbox` icon importeren uit `lucide-react`). Plaats bewust vóór Intelligence — Inbox = dagelijks-aandacht-oppervlak; Intelligence/Review/Projects zijn analyse-tooling (zie open vraag #4).
- Count-bedrading: het patroon is GEEN `CountSeeder`. `apps/cockpit/src/app/(dashboard)/layout.tsx:9` doet `Promise.all([reviewCount, focusProjects])` en passt counts als props door aan `DesktopSidebar` (regel 17) + `SideMenu` (regel 22). Wijzigen:
  - Layout: voeg `inboxCount` toe aan de `Promise.all` (gebruikt `countInboxItemsForTeam`), pass door als prop.
  - `apps/cockpit/src/components/layout/desktop-sidebar.tsx:73-80`: voeg `inboxCount?: number` prop toe + breid `badges`-record uit.
  - `apps/cockpit/src/components/layout/side-menu.tsx:88-97`: idem.

### 8. Portal display-updates

- `apps/portal/src/lib/issue-status.ts`: voeg kleur-entry toe voor de nieuwe portal-groep `parked`. `STATUS_COLORS`-mapping in `constants/issues.ts` doet de rest.
- Decline-reason rendering: nieuw component `apps/portal/src/components/feedback/declined-banner.tsx` dat onder de status-badge een eenregelige uitleg toont: `"Afgewezen — {issue.decline_reason}"`. Wire in alle plekken waar issue-status wordt gerenderd in portal (`apps/portal/src/components/feedback/`, `roadmap/`).

### 9. Ingestion-paden flippen

Centraliseer source-based default in `packages/database/src/constants/issues.ts`:

```ts
const CLIENT_SOURCED = new Set(["portal", "userback", "jaip_widget"]);

/** Default-status bij issue-creation o.b.v. ingestion-bron. Klant-bronnen
 *  passeren de PM-gate; intern (manual/ai) gaat direct naar triage. */
export function defaultStatusForSource(source: string): IssueStatus {
  return CLIENT_SOURCED.has(source) ? "needs_pm_review" : "triage";
}
```

Wired in drie call-sites — geen hardcoded `"needs_pm_review"` literal in callers (DRY tegen toekomstige bron-toevoegingen):

- `apps/portal/src/actions/feedback.ts:58` — `status: defaultStatusForSource("portal")`.
- `packages/database/src/mutations/widget/feedback.ts:39` — `status: defaultStatusForSource("jaip_widget")`.
- Userback-import-pad: bevestig caller-keten met `grep -rn "insertIssue\|upsertUserbackIssues" packages/database/src/`. Nieuwe inserts vanuit Userback gebruiken óók `defaultStatusForSource("userback")`. Bestaande imports blijven onveranderd (geen backfill).

Vermijd de verleiding "altijd `needs_pm_review` bij `insertIssue`" — dat zou manual DevHub-tickets ook door de gate sturen, en die hoeven daar niet door (PM heeft 'm zelf gemaakt).

### 10. Registry & drift-checks

- **`CLAUDE.md` regel 192:** voeg `inbox` toe aan de Cockpit-features-lijst: `themes, meetings, emails, projects, review, directory, inbox`.
- **`scripts/check-feature-drift.sh` regel 21-29:** voeg `"cockpit:inbox"` toe aan de `FEATURES`-array.
- Run lokaal (allemaal moeten groen zijn):
  - `npm run check:features`
  - `npm run check:queries` — geen directe `.from()` in de nieuwe actions.
  - `npm run typecheck`
  - `npm run lint`

### 11. Tests

Volgt CLAUDE.md test-pyramide en mock-grens-beleid:

- **Mutation-tests** (`packages/database/src/mutations/issues/__tests__/pm-review.test.ts`) — `describeWithDb` pattern:
  - `endorseIssue` flipt `needs_pm_review` → `triage`; doet niets bij verkeerde startstatus (idempotent).
  - `declineIssue` zet `decline_reason` + `closed_at`.
  - `deferIssue` flipt naar `deferred`.
  - `convertIssueToQuestion` spawned een `client_questions`-row, linkt FK, en zet status.
- **Action-tests** (`apps/cockpit/src/features/inbox/actions/__tests__/`):
  - Payload-capture mocks per actie; valideer dat `pmReviewActionSchema` faalt op te-korte decline-reason.
  - Auth-failure → `{ error }`.
- **Component-tests** (`apps/cockpit/src/features/inbox/components/__tests__/`):
  - `feedback-action-panel.test.tsx` — vier knoppen renderen, Decline opent modal met required textarea, submit-disabled bij <10 chars.
  - `inbox-list.test.tsx` — sectie-grouping correct (op fixture met mix van items).
- **Validatie-test** (`packages/database/src/validations/__tests__/issues.test.ts`): vier discriminated-union-paden valideren, vier failure-paden.
- **Constants-test** (`packages/database/src/constants/__tests__/issues.test.ts`): alle nieuwe statussen hebben een label én zitten in een portal-status-groep (geen wees-status). Plus table-driven test op `defaultStatusForSource()` (`portal` → `needs_pm_review`, `userback` → `needs_pm_review`, `jaip_widget` → `needs_pm_review`, `manual` → `triage`, `ai` → `triage`).
- **DevHub-non-regression-test**: laad `apps/devhub/src/app/(app)/issues/page.tsx` met fixture die `needs_pm_review`-issues bevat, valideer dat `UNGROUPED_DEFAULT_OPEN` (regel 29) ze NIET toont. Geen code-wijziging in DevHub nodig — `needs_pm_review` zit niet in de array, dus default-filtered uit. Test borgt dat niemand 'm later toevoegt.

### 12. Sprint-index update

`sprints/backlog/README.md`: voeg een rij toe in de "Open backlog"-tabel:

```
| CC-001   | Cockpit Inbox + PM-review-gate                               | Customer Comm | `sprints/backlog/` | Backlog       |
```

## Acceptatiecriteria

- [ ] DB-migratie draait clean op een lege en op een gevulde DB; `chk_issues_status` accepteert nu 10 statussen.
- [ ] `decline_reason` (text, nullable) en `converted_to_question_id` (uuid FK met `ON DELETE SET NULL`) bestaan op `issues`.
- [ ] `ISSUE_STATUSES` + `ISSUE_STATUS_LABELS` + `CLOSED_STATUSES` gesynchroniseerd in `packages/database/src/constants/issues.ts`.
- [ ] `PORTAL_STATUS_GROUPS` mapt vision §5-tabel correct (`needs_pm_review` → "Ontvangen", `declined` → "Afgerond", `deferred` → "Later").
- [ ] `listInboxItemsForTeam` returnt issues uit alle accessible projecten gemerged met open questions, status-first gesorteerd.
- [ ] `endorseIssue`, `declineIssue`, `deferIssue`, `convertIssueToQuestion` zijn als pure mutations beschikbaar én via cockpit-server-actions aan te roepen.
- [ ] Cockpit-sidebar heeft `/inbox` link met live count-badge; `NavItem.badgeKey` type uitgebreid; `(dashboard)/layout.tsx` fetch en prop-passing aangepast.
- [ ] `/inbox` pagina toont drie secties (Wacht op jou / Wacht op klant / Geparkeerd) en empty-state als alles leeg is.
- [ ] `feedback-action-panel` toont vier knoppen; Decline forceert reason ≥10 chars vóór submit.
- [ ] `cockpit-reply-form` post via `role: "team"` — verifieerd in DB-test.
- [ ] Portal-feedback (`/projects/[id]/feedback/new`), widget en Userback-nieuwe inserts landen op `needs_pm_review`, niet meer op `triage`.
- [ ] DevHub `/issues` (filter `UNGROUPED_DEFAULT_OPEN`) toont GEEN `needs_pm_review` issues.
- [ ] Portal-statusbadge toont "Ontvangen" voor `needs_pm_review`, "Later" voor `deferred`, "Afgewezen — {reason}" voor `declined`.
- [ ] `npm run check:features`, `npm run check:queries`, `npm run typecheck`, `npm run lint` zijn alle vier groen.
- [ ] CLAUDE.md regel 192 + `scripts/check-feature-drift.sh` regel 21-29 bevatten `inbox` resp. `cockpit:inbox`.
- [ ] `sprints/backlog/README.md` heeft CC-001 in de open-backlog-tabel.
- [ ] Alle tests uit taak 11 groen.

## Risico's

| Risico                                                                                                                                              | Mitigatie                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bestaande Userback-issues op `triage` blijven onveranderd → DevHub-triage ziet "oude" + nieuwe stroom door elkaar.                                  | Geen backfill (vision §5 is silent over migratie); accept als one-time-cost. Optioneel: aparte cleanup-sprint na CC-001 die expliciet door PM gefilterd wordt.                                                       |
| Status-flip op ingestion breekt bestaande consumers die hard op `status='triage'` checken (analytics, dashboards, AI-classifier triggers).          | Audit vóór merge: `grep -rn "status.*triage\|'triage'" apps packages` — elke hit valideren of hij nu ook `needs_pm_review` zou moeten meenemen. Centraliseer multi-status checks via expliciete arrays per use-case. |
| Concurrency: twee PMs reviewen tegelijk hetzelfde item (één endorsed, ander declined).                                                              | Optimistic concurrency in mutations: status-guard `where id=$1 and status='needs_pm_review'`. Mutation faalt stil als rij al gemoved is; cockpit toont "andere reviewer was sneller"-toast bij `affected_rows = 0`.  |
| RLS lekt cross-project: cockpit-inbox toont per ongeluk projecten waar de team-member geen access op heeft.                                         | Strict `listAccessibleProjectIds(profile.id, supabase)` als project-filter. Geen `getAdminClient()` shortcut in de query.                                                                                            |
| Migratie breekt productie als `chk_issues_status` constraint niet droppable is in één transactie.                                                   | Test op staging eerst; `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` patroon in dezelfde migratie.                                                                                                                  |
| `converted_to_question_id` FK creëert een cycle (issues→client_questions terwijl client_questions.issue_id al naar issues wijst).                   | `ON DELETE SET NULL` aan beide kanten houdt 't acyclisch in delete-order; documenteer in migratie-comment.                                                                                                           |
| Portal-rendering toont "Ontvangen" precies zoals bestaande `triage` — klant ziet geen verschil tussen "wij zien 't" en "wij hebben 't gevalideerd". | Bewust gewenst (vision §5 — "Yes (as 'received')"). Niet de PM-fase aan klant tonen — dat zou interne workflow lekken.                                                                                               |
| Inbox-counter-query draait op elke pageload en schaalt niet.                                                                                        | Drie `count: 'exact', head: true` calls + partial index `idx_issues_status_pm_review`. Bij >10k items ooit: cache in een server-action of move naar realtime-subscribed counter.                                     |
| AI-draft-knop in vision §6 wordt ten onrechte verwacht in CC-001.                                                                                   | Expliciet uitgesloten in "Niet in scope" + README van de feature.                                                                                                                                                    |

## Niet in scope

Bewust uitgesteld naar latere CC-sprints (volgens vision §12):

- **Resend-mailnotificaties** bij nieuwe items / status-changes — CC-002.
- **DevHub source-badge** voor client-sourced tickets — CC-003.
- **Outbound proactive messages + AI-draft + review-gate** — CC-004.
- **Per-project inbox-tab** (`/projects/[id]/inbox` in cockpit) en **onboarding-card** in portal-inbox — CC-005.
- **AI-draft-knop** in cockpit-reply (vision §6 "Phase 2") — apart, na CC-004.
- **Backfill** van bestaande `triage`-issues naar `needs_pm_review` — geen plan; PM doorloopt de huidige backlog manueel.
- **Audit-trail-rijen** bij endorse/decline/defer/convert — vision §10 decision #4 ("audit-layer deferred"). Wel voorbereiden door alle vier mutations een `actorId`-param te accepteren — toekomstig `audit_events` insert kan zonder signature-change toegevoegd worden.
- **Conversation-composer voor convert-to-qa** — CC-001 levert een minimale modal met body-textarea; rich-edit + due-date + topic-link komen in CC-005.

## Vision-alignment (samenvatting)

CC-001 is sprint 1/5 uit `vision-customer-communication.md` §12 en implementeert §3 (inbox-model), §5 (PM-review-gate + 4 acties + 3 nieuwe statussen) en §6 (two-way reply met `role: "team"`). De inbox-shell volgt §9 (status-first sorting + onboarding-cue, waar de cue zelf in CC-005 komt).

Na voltooiing trigger CC-002 (Resend) — zonder notificaties blijft de inbox onbezocht (vision §8 "the difference between 'portal that nobody visits' and 'portal as primary channel'").

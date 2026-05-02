# Micro Sprint CC-001: Cockpit Inbox + PM-Review-Gate

## Doel

Bouw de fundament-sprint van de Customer-Communication-laag: een nieuwe Inbox-feature in cockpit waar de PM alle inkomende klant-feedback en open vragen op één plek ziet, en waar feedback-items een **PM-review-gate** passeren vóór ze in de DevHub-backlog landen.

Vandaag stroomt klant-feedback (portal/widget/userback) direct in DevHub-triage met status `triage`, en zit een developer als eerste mens op de melding. Dat conflict met jullie eigen "verification before truth"-principe (`vision-ai-native-architecture.md` §6) en met hoe het bedrijf werkt — de PM kent scope, contract en historie, een developer niet. Resultaat: scope-creep tickets in dev-backlog, dubbele meldingen, en developers die de facto product manager spelen.

CC-001 verandert dit door:

1. Een nieuwe status `needs_pm_review` toe te voegen — eerste stop voor alle klant-gesourcede issues.
2. Vier PM-acties (endorse / decline / defer / convert) op deze items, elk met een eigen vervolgstatus.
3. Een nieuwe Inbox-feature in cockpit die deze items toont **plus** open `client_questions` (Q&A) — alles wat aandacht van het team vraagt op één plek.
4. Two-way messaging te activeren — DB ondersteunt al `role: "team"` op `client_questions` replies, alleen UI ontbreekt aan cockpit-zijde.
5. Default-status bij ingestion van portal/widget/userback te flippen naar `needs_pm_review` zodat de gate niet omzeild kan worden.

CC-002 t/m CC-005 leunen allemaal op deze sprint. Zonder CC-001: geen notificaties (CC-002 heeft geen events), geen badge (CC-003 heeft geen onderscheidende statussen), geen outbound (CC-004 heeft geen decline-trigger), geen tab/onboarding (CC-005 heeft geen inbox).

Dit is sprint 1 van 5 (CC-001 t/m CC-005) afgeleid uit `docs/specs/vision-customer-communication.md` §12.

## Vision-alignment

- `vision-customer-communication.md` **§3** — Inbox-model: "We do not build separate inbox databases for portal and cockpit. Every communication item lives in a single row in the shared Supabase instance and is rendered through two role-appropriate views." CC-001 implementeert de cockpit-view; portal-inbox bestaat al (PR-022).
- **§5** — Volledige PM-endorsement-flow: endorse → `triage`, decline → `declined` met reason, defer → `deferred`, convert → `converted_to_qa`. Met de exact statuslijst uit §5 tabel.
- **§6** — Two-way messaging: "Cockpit Inbox shows open questions across projects, status-first ordered. Reply form supports plain text + attachments." DB is klaar (`packages/database/src/mutations/client-questions.ts:104` accepteert `role: "team"`).
- **§9** — UX-principes: status-first sortering, conversation threading, type-filters als tabs.
- **§10** decisions #2 (multi-stakeholder deferred) en #6 (out-of-office: founders zien alles) — geen multi-user routing in v1, beide founders hebben volledige toegang.
- `vision-ai-native-architecture.md` §3 stap 5 (recent geüpdatet): "Bug/request reported → AI classifies → Appears in Cockpit Inbox → PM reviews → Endorsed items become DevHub triage tickets". CC-001 implementeert exact deze pijl.

## Afhankelijkheden

- **Geen** dependency op CC-002/003/004/005 — CC-001 is fundament.
- Bestaande `issues`-tabel met statuslijst `triage|backlog|todo|in_progress|done|cancelled` (CHECK constraint in `supabase/migrations/20260409100005_devhub_quality_fixes.sql:35-36`).
- Bestaande TypeScript-statuslijst `ISSUE_STATUSES` + `ISSUE_STATUS_LABELS` in `packages/database/src/constants/issues.ts:13-21,49-56`.
- Bestaande portal-status-mapping `PORTAL_STATUS_GROUPS` in `packages/database/src/constants/issues.ts:97-163` (4 buckets voor klant-display).
- Bestaande issue-ingestion-paths met huidige `status: "triage"` default:
  - `apps/portal/src/actions/feedback.ts:58`
  - `packages/database/src/mutations/widget/feedback.ts:39`
  - `packages/database/src/mutations/issues/core.ts:65` (`insertIssue` — gebruikt voor manual + Userback)
- Bestaande DevHub triage-filter via `params.status` in `packages/database/src/queries/issues/core.ts:154-156`. Default-statussen voor DevHub-page: `apps/devhub/src/app/(app)/issues/page.tsx:29-30`.
- Bestaande `client_questions`-tabel + mutations (PR-022): `sendQuestion`, `replyToQuestion(role: "team"|"client")`, `listOpenQuestionsForProject`. Cross-project list ontbreekt — CC-001 voegt toe.
- Bestaande feature-folder-conventie: `apps/cockpit/src/features/<naam>/{actions,components,validations,hooks}/` + README per feature (CLAUDE.md §Feature-structuur).
- `npm run check:features` registry — moet uitgebreid met `cockpit:inbox`.

## Open vragen vóór start

1. **Sidebar-positie van Inbox?** Aanbeveling: **bovenaan primary nav, vóór Intelligence**. De Inbox is een dagelijks-aandacht-oppervlak (zoals een email-inbox); andere primary-items (Intelligence, Review, Projects) zijn analyse-tooling. Met badge-counter rechts ("Inbox 3") wordt hij het natuurlijke startpunt. Niet onder "Bronnen" — daar zitten read-only ingestion-views (Meetings, Emails), Inbox is actie-oppervlak.
2. **Realtime updates of polling?** Aanbeveling: **server-side revalidate na elke action + Next.js auto-refresh op page**. Geen Supabase realtime in v1 — overkill voor een inbox die je 5x per dag opent. Bij volume kunnen we later upgraden. Counter-badge in sidebar wel realtime via een lichte poll (10s interval) zodat een PM tijdens werk weet wanneer er iets binnenkomt.
3. **Cross-project view default voor PM?** Aanbeveling: **ja, alle projecten van de organisatie default**. Bij meerdere klanten wil PM dat in één lijst zien. Filter-dropdown om naar één project te zoomen. CC-005 voegt later per-project tab toe als view binnen project-detail-pagina.
4. **Decline-reason UI: modal of inline?** Aanbeveling: **modal**. Decline = belangrijke actie met irreversible gevolgen voor klant-relatie; verdient een focus-moment. Modal heeft textarea + voorbeelden ("scope-creep", "duplicate van #123", "niet realiseerbaar binnen budget"), preview van wat klant zal zien, dubbele bevestiging. Niet inline — te makkelijk per ongeluk te triggeren.
5. **Convert-to-QA: vraag-tekst handmatig of AI-suggested?** Aanbeveling: **handmatig in v1**, AI-suggested komt in CC-004. Modal met een textarea waarin PM zelf de verhelderingsvraag formuleert ("Bedoelt u feature X of feature Y?"). Spawnt nieuwe `client_questions` row met `issue_id`-link naar source. Source-issue wordt `converted_to_qa`. Klant ziet origineel als "wachten op verheldering" + nieuwe vraag in inbox.
6. **Status-naming: `converted_to_qa` of korter?** Aanbeveling: **`converted_to_qa` houden**. Lang maar zelf-documenterend. CHECK-constraint kosten zijn nul, en je leest 't bijna nooit zonder context.
7. **`decline_reason` kolom: required?** Aanbeveling: **NOT NULL bij decline-actie, NULL elders**. Geen DB-level CHECK (te complex met andere statussen), maar Zod-validatie op decline-action: `decline_reason` required + min 10 chars. Dit dwingt PM tot betekenisvolle uitleg, niet alleen "nope".
8. **Welke nieuwe statussen tellen als "open"/"closed"?** Aanbeveling: `declined` + `converted_to_qa` als CLOSED (final-state), `needs_pm_review` + `deferred` als OPEN (actief in inbox). Past bij hoe `closed_at` getriggerd wordt op andere closed-statussen (`done`, `cancelled`).

## Taken

Bouwvolgorde **schema → constants → mutations → ingestion-flip → DevHub filter-update → cockpit feature → registry → tests → docs**. Schema eerst zodat alle latere lagen tegen vaste status-set werken.

### 1. DB-migratie: nieuwe statussen + decline_reason

Pad: `supabase/migrations/<timestamp>_pm_review_gate.sql`.

```sql
-- 1. Verwijder bestaande CHECK constraint
ALTER TABLE issues DROP CONSTRAINT IF EXISTS chk_issues_status;

-- 2. Hernieuw met uitgebreide statuslijst
ALTER TABLE issues ADD CONSTRAINT chk_issues_status
  CHECK (status IN (
    'needs_pm_review', 'triage', 'backlog', 'todo',
    'in_progress', 'done', 'cancelled',
    'declined', 'deferred', 'converted_to_qa'
  ));

-- 3. Decline-reason kolom (NULL toegestaan; required-validatie via Zod op action-niveau)
ALTER TABLE issues ADD COLUMN IF NOT EXISTS decline_reason text;

-- 4. Convert-link: welke client_question is hieruit ontstaan
ALTER TABLE issues ADD COLUMN IF NOT EXISTS converted_to_question_id uuid
  REFERENCES client_questions(id) ON DELETE SET NULL;

-- 5. Indices: needs_pm_review wordt frequent gequeryd in cockpit-inbox
CREATE INDEX IF NOT EXISTS idx_issues_needs_pm_review
  ON issues (project_id, created_at DESC)
  WHERE status = 'needs_pm_review';

-- 6. closed_at trigger uitbreiden voor declined/converted_to_qa
-- (Hangt af van bestaande trigger-implementatie — controleer en update)
```

Regenereer types via `npm run -w @repo/database supabase:types`.

### 2. Constants + types update

Pad: `packages/database/src/constants/issues.ts`.

```ts
export const ISSUE_STATUSES = [
  "needs_pm_review", // NEW: eerste stop voor klant-gesourcede issues
  "triage",
  "backlog",
  "todo",
  "in_progress",
  "done",
  "cancelled",
  "declined", // NEW: PM heeft afgewezen, klant ziet uitleg
  "deferred", // NEW: PM heeft geparkeerd
  "converted_to_qa", // NEW: PM heeft omgezet in vervolgvraag
] as const;

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  needs_pm_review: "Wacht op review",
  triage: "Triage",
  backlog: "Backlog",
  todo: "Te doen",
  in_progress: "In behandeling",
  done: "Afgerond",
  cancelled: "Geannuleerd",
  declined: "Afgewezen",
  deferred: "Geparkeerd",
  converted_to_qa: "Omgezet in vraag",
};

export const PM_REVIEW_STATUSES = ["needs_pm_review"] as const; // wacht op PM
export const PM_DECIDED_STATUSES = ["declined", "deferred", "converted_to_qa"] as const;
export const CLOSED_STATUSES = ["done", "cancelled", "declined", "converted_to_qa"] as const;
```

Update `PORTAL_STATUS_GROUPS` voor klant-zichtbare mapping:

```ts
export const PORTAL_STATUS_GROUPS = [
  {
    key: "ontvangen",
    label: "Ontvangen",
    internalStatuses: ["needs_pm_review", "triage"], // beide tonen we als "ontvangen"
  },
  {
    key: "ingepland",
    label: "Ingepland",
    internalStatuses: ["backlog", "todo"],
  },
  {
    key: "in_behandeling",
    label: "In behandeling",
    internalStatuses: ["in_progress"],
  },
  {
    key: "afgerond",
    label: "Afgerond",
    internalStatuses: ["done", "cancelled"],
  },
  {
    key: "afgewezen",
    label: "Afgewezen",
    internalStatuses: ["declined"],
    // klant ziet decline_reason daaronder
  },
  {
    key: "later",
    label: "Geparkeerd",
    internalStatuses: ["deferred"],
  },
  {
    key: "vervolgvraag",
    label: "We hebben een vraag",
    internalStatuses: ["converted_to_qa"],
  },
] as const;
```

### 3. Nieuwe PM-action mutations

Pad: `packages/database/src/mutations/issues/pm-review.ts` (nieuw — separaat bestand omdat dit qua domein anders is dan generieke `core.ts`-mutations).

```ts
export async function endorseIssue(
  input: { issueId: string },
  reviewer: { profile_id: string },
  client?: SupabaseClient,
): Promise<MutationResult<IssueRow>>;

export async function declineIssue(
  input: { issueId: string; decline_reason: string }, // Zod: min 10 chars
  reviewer: { profile_id: string },
  client?: SupabaseClient,
): Promise<MutationResult<IssueRow>>;

export async function deferIssue(
  input: { issueId: string },
  reviewer: { profile_id: string },
  client?: SupabaseClient,
): Promise<MutationResult<IssueRow>>;

export async function convertIssueToQuestion(
  input: { issueId: string; question_body: string }, // Zod: min 5 chars
  reviewer: { profile_id: string },
  client?: SupabaseClient,
): Promise<MutationResult<{ issue: IssueRow; question: ClientQuestionRow }>>;
```

Implementatie-noten:

- **endorse**: alleen status-update naar `triage`. Geen reden vereist.
- **decline**: status `declined` + `decline_reason` field. `closed_at = now()`.
- **defer**: status `deferred`. Geen `closed_at` — actief geparkeerd, kan later weer endorsed worden.
- **convert**: tweestaps:
  1. `sendQuestion({ project_id, body: input.question_body, issue_id: input.issueId, ... })` met `sender_profile_id = reviewer.profile_id`.
  2. Update issue: status `converted_to_qa`, `converted_to_question_id = newQuestion.id`, `closed_at = now()`.
     Beide via dezelfde transaction (Supabase RPC of explicit roll-back op fail).

Validations in `packages/database/src/validations/issues-pm-review.ts`:

```ts
export const endorseIssueSchema = z.object({
  issueId: z.string().uuid(),
});

export const declineIssueSchema = z.object({
  issueId: z.string().uuid(),
  decline_reason: z.string().min(10, "Geef minstens 10 tekens uitleg").max(2000),
});

export const deferIssueSchema = z.object({
  issueId: z.string().uuid(),
});

export const convertIssueSchema = z.object({
  issueId: z.string().uuid(),
  question_body: z.string().min(5, "Vraag is te kort").max(2000),
});
```

### 4. Ingestion-paths flippen naar `needs_pm_review`

Drie call-sites updaten zodat klant-gesourcede issues defaulten op `needs_pm_review`. Interne (`manual`/`ai`) blijven `triage`.

| Pad                                                                           | Huidige status          | Nieuwe status                      |
| ----------------------------------------------------------------------------- | ----------------------- | ---------------------------------- |
| `apps/portal/src/actions/feedback.ts:58`                                      | `"triage"`              | `"needs_pm_review"`                |
| `packages/database/src/mutations/widget/feedback.ts:39`                       | `"triage"`              | `"needs_pm_review"`                |
| `packages/database/src/mutations/issues/core.ts:65` (`insertIssue`)           | impliciet via DEFAULT   | **niet wijzigen** — caller bepaalt |
| Userback-sync (waar `insertIssue` voor `source='userback'` aangeroepen wordt) | nu `"triage"` impliciet | expliciet `"needs_pm_review"`      |

Voor `insertIssue` in `core.ts`: callers moeten zelf de juiste status meegeven. Voeg een helper `defaultStatusForSource(source: string): IssueStatus` toe in `packages/database/src/constants/issues.ts`:

```ts
const CLIENT_SOURCED = new Set(["portal", "userback", "jaip_widget"]);

export function defaultStatusForSource(source: string): IssueStatus {
  return CLIENT_SOURCED.has(source) ? "needs_pm_review" : "triage";
}
```

Wired in alle drie de ingestion-paths. Bij refactoring: vermijd de regel "altijd `needs_pm_review`" — dat zou manual-tickets ook in de gate stoppen, en die hoeven daar niet door (PM heeft 'm zelf gemaakt).

### 5. DevHub triage-filter update

DevHub mag `needs_pm_review` items NIET tonen — die wachten op cockpit. Update `apps/devhub/src/app/(app)/issues/page.tsx:29-30`:

```ts
const UNGROUPED_DEFAULT_OPEN = ["triage", "backlog", "todo", "in_progress"] as const;
// needs_pm_review bewust NIET hier — staat in cockpit-inbox
const UNGROUPED_DEFAULT_DONE = ["done"] as const;
```

Bestaande filter-architectuur (`params.status` array) is voldoende — geen verdere code-wijziging nodig. Defensieve test in CC-001 testset: een `needs_pm_review`-issue verschijnt NIET in DevHub-default-view, ook niet bij scroll-pagination.

### 6. Cockpit Inbox feature

Pad: `apps/cockpit/src/features/inbox/` (nieuw, volledig vertical-feature).

Structuur volgens CLAUDE.md feature-conventie:

```
apps/cockpit/src/features/inbox/
├── README.md                                    # menu per laag
├── actions/
│   ├── pm-review.ts                            # endorse/decline/defer/convert server-actions
│   └── reply-question.ts                       # team-reply op client_questions
├── components/
│   ├── inbox-view.tsx                          # main container — accepteert optionele projectId
│   ├── inbox-tabs.tsx                          # status-eerst sortering: "Te doen" / "Wachtend" / "Klaar"
│   ├── inbox-item-card.tsx                     # generic card render
│   ├── feedback-item-row.tsx                   # render needs_pm_review item met 4 actie-knoppen
│   ├── question-thread-row.tsx                 # render client_questions thread met team-reply form
│   ├── decline-modal.tsx                       # modal voor decline-reason input
│   ├── convert-modal.tsx                       # modal voor convert-to-QA vraag-input
│   └── inbox-filters.tsx                       # project-filter dropdown
└── validations/
    └── inbox.ts                                # re-export van Zod schemas voor convenience
```

Pad nieuwe app-route: `apps/cockpit/src/app/(dashboard)/inbox/page.tsx` (nieuw).

```tsx
import { InboxView } from "@/features/inbox/components/inbox-view";
import { listInboxItems } from "@repo/database/queries/inbox";

export default async function InboxPage() {
  const items = await listInboxItems(); // cross-project default
  return <InboxView items={items} />;
}
```

Plus `loading.tsx` + `error.tsx`.

### 7. Cross-project queries

Pad: `packages/database/src/queries/inbox.ts` (nieuw — coherent sub-domein dat zowel `issues.needs_pm_review` als `client_questions.open` aggregeert).

```ts
export interface InboxItem {
  kind: "feedback" | "question";
  id: string;
  project_id: string;
  project_name: string;
  organization_id: string;
  title: string;
  body: string | null;
  source: string | null; // alleen voor feedback
  status: string; // issue-status of question-status
  created_at: string;
  // type-specific extra context
  feedback?: { issue: IssueRow };
  question?: { question: ClientQuestionRow; latest_reply?: ClientQuestionRow };
}

export async function listInboxItems(
  filters?: { projectId?: string },
  client?: SupabaseClient,
): Promise<InboxItem[]>;

export async function countInboxItems(client?: SupabaseClient): Promise<number>; // voor sidebar-badge
```

Implementatie: twee parallel queries (UNION-style in JS, niet SQL — overzichtelijker), beide gefilterd op `organization_id IN <user's orgs>`. Sortering: status-eerst (zie taak 8), tiebreak op `created_at DESC`.

NB: query-cluster — vrijwel zeker `flat` qua CLAUDE.md hard-criteria (één coherent sub-domein, <300 regels verwacht). Houd in `inbox.ts` enkelvoudig bestand. Promote naar `queries/inbox/` cluster pas als CC-006/007 nieuwe sub-domeinen toevoegen.

### 8. Status-eerst sortering UX

Vision §9: "Status-first sorting, not type-first. Top section: 'needs your attention'." Implementatie:

```ts
const ATTENTION_ORDER = [
  "needs_pm_review", // klant-feedback wacht op jou
  "open", // open question wacht op antwoord
  "deferred", // geparkeerd, herinnert je dat 't er staat
  "responded", // klant heeft je geantwoord
];
```

In UI: drie secties met headers:

- **"Te doen"** (`needs_pm_review` + open `client_questions`)
- **"Wachtend op klant"** (geparkeerd / waiting-on-response items)
- **"Recent klaar"** (laatste 7 dagen `declined`/`done`/`responded`)

### 9. Server-actions in cockpit

Pad: `apps/cockpit/src/features/inbox/actions/pm-review.ts`.

```ts
"use server";

export async function endorseIssueAction(input: { issueId: string }): Promise<ActionResult>;
export async function declineIssueAction(input: {
  issueId: string;
  decline_reason: string;
}): Promise<ActionResult>;
export async function deferIssueAction(input: { issueId: string }): Promise<ActionResult>;
export async function convertIssueAction(input: {
  issueId: string;
  question_body: string;
}): Promise<ActionResult<{ questionId: string }>>;
```

Elke action:

1. Auth-check via `getCurrentProfile` (alleen admin/member; client-rol blokkeert).
2. Zod-validate via schemas uit `packages/database/src/validations/issues-pm-review.ts`.
3. Roep mutation aan met `reviewer.profile_id`.
4. `revalidatePath('/inbox', 'page')` + `revalidatePath('/issues', 'page')` (DevHub triage shifts).
5. Return `{ success: true }` of `{ error: string }`.

Plus `apps/cockpit/src/features/inbox/actions/reply-question.ts`:

```ts
export async function replyAsTeamAction(input: {
  parent_id: string;
  body: string;
}): Promise<ActionResult> {
  // ... auth + validate ...
  return await replyToQuestion(input, { profile_id: profile.id, role: "team" }, supabase);
}
```

Wired tegen bestaande `replyToQuestion` mutation — DB is al klaar voor `role: "team"`.

### 10. Sidebar + counter

Update `apps/cockpit/src/lib/constants/navigation.ts`: voeg "Inbox" toe aan `primaryNavItems`, vóór "Intelligence":

```ts
{ href: "/inbox", label: "Inbox", icon: InboxIcon, badgeKey: "inboxCount" },
```

Counter via een nieuwe client-component dat `countInboxItems()` polled (10s interval, of fetcht op route-change). Houd 't simpel — geen Supabase-realtime in v1.

### 11. Registry update

CLAUDE.md feature-registry:

| Type                          | Cockpit                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------ |
| Features (`features/[naam]/`) | `themes`, `meetings`, `emails`, `projects`, `review`, `directory`, **`inbox`** |

Update beide:

- `CLAUDE.md` regel 192 (Cockpit features-rij in registry-tabel)
- `scripts/check-feature-drift.sh` regel 28 (allowlist)

Vóór elke code-add die in `features/inbox/` landt — anders blokkeert pre-commit hook.

### 12. README per feature

Pad: `apps/cockpit/src/features/inbox/README.md`.

Volg structuur uit `apps/cockpit/src/features/meetings/README.md` (zie CC-005 onderzoek). Sectie-template: menu per laag, gerelateerde packages, database schema, routes, design decisions, tests, migration history.

### 13. Tests

- **DB constraint** (`packages/database/__tests__/migrations/pm-review-gate.test.ts`): elke nieuwe status accepteer; alle bestaande statussen behouden.
- **Mutations** (`packages/database/__tests__/mutations/issues-pm-review.test.ts`): describeWithDb, één test per actie. Decline zonder reason → Zod faalt. Convert maakt nieuwe `client_questions` rij + linkt issue.
- **Ingestion-flip**:
  - `apps/portal/__tests__/actions/feedback.test.ts` — verifieer issue krijgt `needs_pm_review`, niet `triage`.
  - `packages/database/__tests__/mutations/widget-feedback.test.ts` — idem.
  - `packages/database/__tests__/constants/default-status-for-source.test.ts` — table-driven test op `defaultStatusForSource()`.
- **DevHub filter**:
  - `apps/devhub/__tests__/issues-page-needs-pm-review-hidden.test.ts` — `needs_pm_review` issue verschijnt NIET in default-view.
- **Cross-project query**:
  - `packages/database/__tests__/queries/inbox.test.ts` — feedback + questions samen, sortering correct, project-filter werkt.
- **Cockpit actions** (`apps/cockpit/__tests__/features/inbox/actions/pm-review.test.ts`): integration met describeWithDb, end-to-end endorse → status verandert + DevHub-query ziet 't nu wel.
- **Components** (`apps/cockpit/__tests__/features/inbox/components/`): inbox-view rendert items in juiste sectie; decline-modal verzorgt validatie-feedback; reply-form roept action aan met juiste payload.
- **Portal display** (`apps/portal/__tests__/components/feedback/status-display.test.tsx`): nieuwe statussen mappen naar juiste `PORTAL_STATUS_GROUPS`-bucket.

### 14. Docs

- Update `vision-customer-communication.md` §11 — markeer "needs_pm_review status, decline/defer/convert acties" als implemented in CC-001.
- Update `docs/specs/requirements-portal.md` — voeg requirements voor decline-reason-display, deferred-display, vervolgvraag-display.
- Update `docs/specs/platform-spec.md` — als de status-flow daar gedocumenteerd staat, sync de nieuwe statussen.
- Voeg CC-001 rij toe aan `sprints/backlog/README.md`.

## Acceptatiecriteria

- [ ] Migration `pm-review-gate.sql` toegepast: nieuwe statussen + `decline_reason` + `converted_to_question_id` kolommen.
- [ ] `ISSUE_STATUSES`/`ISSUE_STATUS_LABELS` uitgebreid; `PORTAL_STATUS_GROUPS` heeft mapping voor alle nieuwe statussen.
- [ ] `endorseIssue`/`declineIssue`/`deferIssue`/`convertIssueToQuestion` mutations bestaan met Zod-validatie.
- [ ] Klant submit via portal → issue krijgt `status='needs_pm_review'`, NIET `triage`.
- [ ] Klant submit via widget → issue krijgt `status='needs_pm_review'`.
- [ ] Userback-sync → nieuwe issues krijgen `status='needs_pm_review'`.
- [ ] Manual issue-creation in DevHub → blijft `status='triage'` (interne flow ongemoeid).
- [ ] DevHub triage-page toont GEEN `needs_pm_review` items in default-view.
- [ ] Cockpit `/inbox` route bestaat; toont `needs_pm_review` issues + open `client_questions` cross-project, status-eerst gesorteerd in 3 secties.
- [ ] PM kan endorse → issue verschijnt nu in DevHub triage met status `triage`.
- [ ] PM kan decline → modal vraagt reason (min 10 chars), issue → `declined` met `decline_reason`, `closed_at` gezet. Klant ziet "Afgewezen" + reden in portal.
- [ ] PM kan defer → issue → `deferred`, blijft in cockpit-inbox in "Wachtend" sectie.
- [ ] PM kan convert → modal vraagt verhelderingsvraag, spawnt `client_questions` row met `issue_id`-link, issue → `converted_to_qa`. Klant ziet zowel origineel ("we hebben een vraag") als nieuwe vraag in portal-inbox.
- [ ] PM kan replyen op open `client_questions` thread vanuit cockpit-inbox; reply landt met `role: "team"` in DB.
- [ ] Sidebar-counter "Inbox (N)" werkt en update binnen 10s na nieuwe item.
- [ ] `npm run check:features` slaagt na registry-update.
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run check:queries` allemaal groen.
- [ ] CC-001 rij toegevoegd aan `sprints/backlog/README.md`.

## Risico's

| Risico                                                                                                                     | Mitigatie                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status-flip op ingestion breekt bestaande flows die op `triage` rekenen (analytics, dashboards, AI-classifier triggers).   | Audit alle code die `status='triage'` checkt vóór merge: `grep -rn "status.*triage\|'triage'" apps packages`. Update naar `OPEN_PM_OR_TRIAGE` constant of expliciete arrays per use-case.         |
| PM is afwezig → `needs_pm_review`-pile groeit ongezien.                                                                    | Vision §10 #6: founders zien alles, geen routing v1. Acceptabel risico. CC-002 mailt klant na endorsement → klant blijft op de hoogte. Founder-bandbreedte is hoog genoeg voor huidige volume.    |
| Migration heeft impact op productie-issues die al status `triage` hebben → moeten ze terug naar `needs_pm_review`?         | **Nee, niet retroactief**. Bestaande tickets houden status — migration voegt alleen toe. Backfill-script alleen als product-decisie maakt dat ze gereviewd moeten worden. Default = vooruit-only. |
| Convert-flow spawnt question; als question-mutation faalt → issue staat al op `converted_to_qa` zonder bijbehorende vraag. | Use Supabase RPC voor transactional convert, of explicit try/catch + roll-back van issue-status bij question-fail. Test op fail-pad.                                                              |
| Klant ziet `decline_reason` letterlijk; PM kan onhandige tekst typen.                                                      | Zod min-10-chars + UI-helper-tekst ("schrijf alsof je het de klant zelf zou zeggen"). CC-004 voegt later AI-draft-laag toe die de reason omzet in tactvolle uitleg-mail.                          |
| Inbox-counter polled elke 10s = 6 requests/min × N team-leden = lichte DB-load.                                            | Acceptabel bij <10 team-leden. Bij groei: switchen naar Supabase realtime of langere interval.                                                                                                    |
| Cross-project query trekt veel data bij groei (>100 active items).                                                         | `listInboxItems` heeft pagination-param ready (limit/offset). Default limit 50, lazy-load on scroll.                                                                                              |
| RLS-conflict: cockpit-actions gebruiken admin-client default; team-rol moet via auth-flow lopen.                           | Volg bestaand patroon uit `apps/portal/src/actions/inbox.ts`: `createClient()` met user-session, niet admin. Auth-check via `getCurrentProfile`.                                                  |
| Concurrency: twee PMs reviewen tegelijk hetzelfde item.                                                                    | Optimistic concurrency check: mutation faalt als status NIET meer `needs_pm_review` is op moment van update. Toon "andere reviewer was sneller"-toast.                                            |

## Niet in scope

- **Bulk-actions** ("decline all 5 selected") — één-voor-één v1.
- **AI-classifier vóór de gate** — vision §3 noemt 't, maar v1 = pure menselijke triage. AI-pre-suggestie komt later (CC-007 of zo).
- **Per-project per-rol routing** — vision §10 #2 deferred (multi-stakeholder).
- **Auto-decline na X dagen** — items blijven hangen tot menselijke actie.
- **Audit-trail van wijzigingen** — vision §10 #4 deferred.
- **Realtime updates** via Supabase realtime — polling v1, realtime later.
- **Notificatie-mail naar klant bij status-flip** — dat is CC-002. CC-001 zorgt alleen dat status verandert; CC-002 hookt op events.
- **Outbound-mail-flow op decline** — dat is CC-004. CC-001 schrijft alleen `decline_reason` naar DB.
- **DevHub source-badge** — dat is CC-003.
- **Per-project inbox-tab + onboarding** — dat is CC-005.

## Vision-alignment (samenvatting)

CC-001 is sprint 1/5 uit `vision-customer-communication.md` §12 en het architecturele fundament voor de gehele Customer-Communication-laag. Na merge:

- Klant-feedback gaat door PM-gate vóór dev-backlog (vision §5 ✅)
- Cockpit heeft globale Inbox view (vision §3 ✅)
- Two-way messaging is operationeel (vision §6 ✅)
- Status-eerst UX-principe geïmplementeerd (vision §9 ✅)

CC-002 (notify), CC-003 (badge), CC-004 (outbound), CC-005 (tab+onboarding) plakken hier bovenop zonder dit fundament te veranderen.

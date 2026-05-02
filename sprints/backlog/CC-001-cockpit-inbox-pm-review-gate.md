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
- **Design-referentie:** `/inbox-preview` (cockpit) — `apps/cockpit/src/app/(dashboard)/inbox-preview/page.tsx` toont het beoogde eindbeeld voor zowel de Linear-overzicht-stijl als de iMessage conversation-detail. Implementatie van deze sprint matcht die mockup pixel-niveau waar redelijk.
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

**1a. Status-uitbreiding op `issues`:**

- `ALTER TABLE issues DROP CONSTRAINT IF EXISTS chk_issues_status;`
- `ALTER TABLE issues ADD CONSTRAINT chk_issues_status CHECK (status IN ('needs_pm_review','triage','backlog','todo','in_progress','done','cancelled','declined','deferred','converted_to_qa'));`
- `ALTER TABLE issues ADD COLUMN IF NOT EXISTS decline_reason text;`
- `ALTER TABLE issues ADD COLUMN IF NOT EXISTS converted_to_question_id uuid REFERENCES client_questions(id) ON DELETE SET NULL;`
- `CREATE INDEX IF NOT EXISTS idx_issues_status_pm_review ON issues(status) WHERE status = 'needs_pm_review';` (partial index — cockpit-inbox query hit 'm continu)
- Comment-blok dat per status uitlegt waar hij thuishoort.

**1b. Activity-tracking op `client_questions` (voor unread-detectie):**

```sql
ALTER TABLE client_questions ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

-- Backfill: bestaande root-rijen krijgen hun eigen created_at als activity-bookmark.
UPDATE client_questions SET last_activity_at = created_at WHERE parent_id IS NULL;

-- Trigger: root-insert zet zichzelf, reply-insert tilt parent op.
CREATE OR REPLACE FUNCTION sync_client_question_activity() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.last_activity_at := NEW.created_at;
  ELSE
    UPDATE client_questions SET last_activity_at = NEW.created_at WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_client_question_activity
  BEFORE INSERT ON client_questions
  FOR EACH ROW EXECUTE FUNCTION sync_client_question_activity();
```

`issues` hebben al een auto-updated `updated_at`; geen extra trigger nodig daar.

**1c. Per-user read-state (`inbox_reads`):**

```sql
CREATE TABLE inbox_reads (
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_kind text NOT NULL CHECK (item_kind IN ('issue', 'question')),
  item_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, item_kind, item_id)
);

CREATE INDEX idx_inbox_reads_profile_kind ON inbox_reads (profile_id, item_kind);

-- RLS: een gebruiker mag alleen zijn eigen reads zien en schrijven.
ALTER TABLE inbox_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inbox_reads: own only" ON inbox_reads FOR ALL TO authenticated
  USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
```

Bewuste keuzes:

- **Geen FK** op `item_id` — polymorphic ref (kan naar `issues` of `client_questions` wijzen). Acceptabel omdat een dangling read-row geen data-corruptie is, alleen wat dood-data dat opgeruimd kan worden.
- **Per-user**, niet per-organisatie: cross-project team-leden hebben elk hun eigen "wat heb ik gezien"-state. Stef kan iets lezen, Wouter nog niet.
- **`item_kind` als string** ipv enum — uitbreidbaar (bv. `outbound_draft` later) zonder migratie.

> **Belangrijk:** GEEN backfill van bestaande `issues`. Read-state default = NULL (alles is "nieuw" voor iedereen na deploy — acceptable one-time-cost).

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

**Cluster-vs-flat:** flat — één coherent domein, verwacht <250 regels met 4 exports. Pad: `packages/database/src/queries/inbox.ts`.

Exports:

- `listInboxItemsForTeam(profileId, supabase)` → `Promise<InboxItem[]>` waar `InboxItem` een discriminated union is mét read-state:

  ```ts
  type InboxItem = {
    kind: "feedback" | "question";
    id: string;
    activityAt: string; // issue.updated_at of client_questions.last_activity_at
    isUnread: boolean; // afgeleid: read_at IS NULL OR read_at < activityAt
    // ... rest van velden per kind
  } & ({ kind: "feedback"; issue: IssueRow } | { kind: "question"; thread: ClientQuestionThread });
  ```

  Strategy:
  1. `listAccessibleProjectIds(profileId, supabase)` (uit `@repo/auth/access:147`) → array van project-ids.
  2. Drie parallelle SELECTs (geen SQL UNION — verlaagt typing-precisie):
     - `issues` waar `project_id IN (...)` AND `status IN ('needs_pm_review','deferred')`, sorteer op `created_at DESC`.
     - `client_questions` waar `project_id IN (...)` AND `parent_id IS NULL`, met embed `replies:client_questions!parent_id (id, body, sender_profile_id, created_at)`, sorteer op `last_activity_at DESC`.
     - `inbox_reads` waar `profile_id = $current` — alle rows in één keer, dan in JS mappen op `(item_kind, item_id)`.
  3. Per item: `isUnread = !read || read.read_at < item.activityAt`. Default voor items zonder read-row: `true` (nieuw).
  4. Merge → status-first sorted (needs_pm_review > question-open > deferred > responded), dan `activityAt DESC`.

- `countInboxItemsForTeam(profileId, supabase)` → `Promise<{ pmReview: number; openQuestions: number; deferred: number; unread: number }>`. Vier `count: 'exact', head: true` calls; `unread` count via een `count(*) FILTER (WHERE read_at IS NULL OR read_at < activity_at)`-style approach (acceptabel: per-PM call elke route-load is goedkoper dan realtime).

- `getConversationThread(messageId, profileId, supabase)` → `Promise<ConversationThread | null>` voor de detail-route (taak 8). Returnt root + alle replies chronologisch + per-message `senderProfile`-info via join. Aanroep markeert thread automatisch als read voor `profileId` (via `markInboxItemRead`).

- `getInboxItemForDetail(kind, id, profileId, supabase)` → `Promise<InboxItem | null>` voor de detail-route header — single-item fetch met dezelfde shape als list-item.

### 4. Mutations — nieuw bestand

Pad: `packages/database/src/mutations/issues/pm-review.ts` (nieuw, naast `core.ts`). Update `mutations/issues/index.ts` met `export * from "./pm-review";`.

Exports — alle vier accepteren `client?: SupabaseClient` (default admin per CLAUDE.md client-scope-policy) én een `actorId: string` (zodat audit-events later zonder signature-break gewired kunnen worden):

- `endorseIssue(id, actorId, client?)` → `update issues set status='triage', updated_at=now() where id=$1 and status='needs_pm_review'`. Defensieve status-guard voorkomt dubbel-endorseren.
- `declineIssue(id, actorId, declineReason, client?)` → `status='declined', decline_reason=$reason, closed_at=now()`.
- `deferIssue(id, actorId, client?)` → `status='deferred'`.
- `convertIssueToQuestion(id, actorId, body, client?)` — issue-eerst om orphan-questions te vermijden:
  1. Lookup issue (`project_id`, `organization_id`).
  2. Update issue: `status='converted_to_qa'`, `closed_at=now()` met status-guard `where id=$1 and status='needs_pm_review'`. `converted_to_question_id` blijft tijdelijk NULL.
  3. Insert `client_questions`-row (`parent_id=null`, `body=$body`, `sender_profile_id=actorId`, `issue_id=$issueId`).
  4. Update issue: zet `converted_to_question_id=$newQuestionId`.

  Bij step-3-fail staat de issue al op `converted_to_qa` zonder bijbehorende vraag — PM ziet "kapot" in cockpit en kan handmatig herstellen. Slechter alternatief is vraag-eerst: dan zou een step-2-fail een orphan `client_questions`-rij achterlaten die de klant wél ziet zonder context. Issue-eerst maakt fail-state intern-zichtbaar i.p.v. klant-zichtbaar. Step 4 mag ook falen — dan ontbreekt enkel de FK-link, niet de data; opruim kan post-hoc linken via `client_questions.issue_id`.

`insertIssue` (`packages/database/src/mutations/issues/core.ts:65-87`) **hoeft niet** te wijzigen: `data.status` is al optioneel input. Callers gaan expliciet `status: "needs_pm_review"` meegeven (taak 9).

**Read-state mutation** in `packages/database/src/mutations/inbox-reads.ts` (nieuw, flat):

```ts
export async function markInboxItemRead(
  profileId: string,
  kind: "issue" | "question",
  itemId: string,
  client?: SupabaseClient,
): Promise<MutationResult<void>>;
```

Implementatie: simpele UPSERT op `(profile_id, item_kind, item_id)` met `read_at = now()`. Idempotent — herhaaldelijk aanroepen is veilig (latere lees overschrijft). Geen Zod nodig: types zijn strict via parameter-signature.

Wired vanuit:

- `getConversationThread` query — markeer auto bij detail-page-laad.
- `endorseIssue`/`declineIssue`/`deferIssue` mutations — markeer auto wanneer reviewer actie neemt.

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

> **Design-referentie:** `/inbox-preview` (cockpit) toont het beoogde eindbeeld
> — sectie "Overzicht" voor de Linear-stijl lijst, sectie "Conversation-detail"
> voor de chat-thread met action-bar. Implementatie matcht die mockup.

Nieuwe folder, structuur volgt `apps/cockpit/src/features/review/`:

```
apps/cockpit/src/features/inbox/
├── README.md
├── actions/
│   ├── pm-review.ts                  # endorse/decline/defer/convert acties
│   ├── replies.ts                    # replyToQuestionAsTeamAction
│   └── mark-read.ts                  # markInboxItemReadAction
├── components/
│   ├── inbox-page.tsx                # /inbox composition-root
│   ├── inbox-header.tsx              # title + count + filter-chips
│   ├── inbox-list.tsx                # time-grouped lijst
│   ├── inbox-row.tsx                 # één rij — Linear-stijl met hover-actions
│   ├── source-dot.tsx                # subtle bron-indicator (Klant-PM/Eindgebr.)
│   ├── conversation-page.tsx         # /inbox/[id] composition-root
│   ├── conversation-header.tsx       # title + project meta + status-pill
│   ├── conversation-action-bar.tsx   # 4 PM-acties (alleen bij feedback-thread)
│   ├── conversation-bubbles.tsx      # iMessage-style thread render
│   ├── conversation-reply-dock.tsx   # vaste reply-form onderaan
│   ├── decline-modal.tsx             # textarea + min-10-chars validatie
│   ├── convert-modal.tsx             # textarea voor verhelderingsvraag
│   └── empty-state.tsx
└── validations/
    └── pm-review.ts                  # re-export schemas
```

**Overzicht-componenten** (matcht `/inbox-preview` sectie II):

- **`inbox-header.tsx`** — links: titel "Inbox" + count badge. Rechts: "+ Nieuw bericht" knop (placeholder tot CC-006). Onder een filter-strip met chips: `[Wacht op mij · N]`, `[Wacht op klant · N]`, `[Geparkeerd · N]`. Default actief = "Wacht op mij". Filter via URL-param `?filter=`.

- **`inbox-list.tsx`** — gefilterde, time-grouped rendering:
  - Time-buckets: "Vandaag" (`activityAt >= today_00:00`), "Eerder deze week" (`>= week_start`), "Eerder" (rest).
  - Per item: `<InboxRow>` — geen secties-per-status (filter-chips doen het filtering-werk).
  - Sticky time-group headers met backdrop-blur.

- **`inbox-row.tsx`** — Linear-stijl rij, één per item:
  - **Status-bullet links**: solid primary dot voor `needs_pm_review` + onbeantwoorde questions; open ring voor responded + deferred.
  - **Avatar** (initial van sender, role-tinted: team=primary, client=violet).
  - **Sender + project** in compacte 2-regel-kolom.
  - **Subject of body-snippet** in flex-1 — `font-semibold` als `isUnread`, anders `font-medium`.
  - **Source-dot** (alleen bij feedback): violet voor Klant-PM, warning voor Eindgebruiker.
  - **Timestamp** rechts — fade-out on row-hover via `group-hover/row:opacity-0`.
  - **Hover-actions** (slide-in vanaf rechts, `opacity-0 group-hover:opacity-100`):
    - `needs_pm_review`: 4 icon-buttons (Check/X/Clock/MessageSquarePlus) → opent modals (decline/convert) of triggert direct (endorse/defer).
    - Andere statussen: één icon (open detail).
  - Klik op rij (buiten action-area): navigeer naar `/inbox/${kind}/${id}`.

**Detail-componenten** (matcht `/inbox-preview` sectie III):

- **`conversation-page.tsx`** — server component op route `/inbox/[kind]/[id]`. Roept `getConversationThread(id, profile.id, supabase)` aan; auto-markeert als read tijdens fetch. Rendert: header → action-bar (alleen voor feedback met `needs_pm_review`) → bubbles → reply-dock.

- **`conversation-header.tsx`** — back-knop + title + meta (project · N berichten · status). Voor feedback: bron-badge naast title. Voor questions: status-pill rechts ("We hebben gereageerd" / "Wacht op klant").

- **`conversation-action-bar.tsx`** — alleen bij `kind === 'feedback' && status === 'needs_pm_review'`. Vier action-pills: Endorse (primary, "→ DevHub"), Decline (destructive), Defer, Convert. Decline en Convert openen modals; Endorse en Defer triggeren direct.

- **`conversation-bubbles.tsx`** — iMessage-conventie:
  - Date-dividers tussen dagen (`Vandaag`, `Gisteren`, `15 mei`).
  - Per bericht: avatar + sender-naam + timestamp + bubble.
  - **PM-bericht (eigen)**: `flex-row-reverse`, bubble in `bg-primary text-primary-foreground`, rounded met `rounded-tr-md` (vlakke hoek aan eigen kant).
  - **Anders bericht**: `flex-row`, bubble in `bg-background ring-foreground/[0.08]`, rounded met `rounded-tl-md`.
  - Plain text rendering, `whitespace-pre-line`. Geen markdown v1.

- **`conversation-reply-dock.tsx`** — vaste reply-form onderaan met paperclip-placeholder (functie out-of-scope), textarea, "Verstuur"-knop. Helper-tekst onderaan: "Antwoord namens team — {clientName} ziet je naam in het portal." Roept `replyToQuestionAsTeamAction`. Plain text v1.

**Modals & misc:**

- **`decline-modal.tsx`** — textarea met placeholder ("scope-creep · duplicate · niet realiseerbaar"), min-10-char Zod-validatie, submit roept `declineIssueAction`. `useTransition` + optimistic close.
- **`convert-modal.tsx`** — textarea voor verhelderingsvraag (min 10 chars), submit roept `convertIssueAction`.
- **`source-dot.tsx`** — re-use van `resolveDevhubSourceGroup` uit CC-003 als die gemerged is, anders eigen kleine resolver. Subtle 1.5×1.5 dot + label op xl-screens.

**Per file (actions):**

- **`actions/pm-review.ts`** — vier server-actions:
  1. `parsed = pmReviewActionSchema.safeParse(input)` → fail-fast.
  2. Auth: cockpit-pattern (`createClient` + `getCurrentProfile`).
  3. Roep mutation aan met `parsed.data` + `profile.id` als actorId.
  4. `markInboxItemRead(profile.id, 'issue', issueId)` — implicit read on action.
  5. Revalideer `/inbox` + `/inbox/issue/[id]`.
  6. Return `{ success: true }` of `{ error }`.

- **`actions/replies.ts`** — `replyToQuestionAsTeamAction(input)`:
  - Mirror van `apps/portal/src/actions/inbox.ts:26-58`, maar `role: "team"` en geen portal-access-check (cockpit is team).
  - Roept `replyToQuestion(parsed.data, { profile_id, role: "team" }, supabase)`.
  - Revalideer `/inbox` + `/inbox/question/[id]`.

- **`actions/mark-read.ts`** — `markInboxItemReadAction(kind, itemId)`:
  - Auth-check, dan `markInboxItemRead(profile.id, kind, itemId, supabase)`.
  - Geen `revalidatePath` — read-state is per-user, route-revalidation komt natuurlijk bij volgende navigatie.

- **`README.md`** — feature-template per CLAUDE.md regel 199. Menu per laag + verwijzing naar `/inbox-preview` als design-bron + bullet "Vrije compose en RLS-update voor klant-root komen in CC-006".

### 7. Cockpit-routes + sidebar

Twee routes onder `(dashboard)`:

- `apps/cockpit/src/app/(dashboard)/inbox/page.tsx` (server component, render `<InboxPage />`) + `loading.tsx` + `error.tsx` — overzicht met filter-strip + time-grouped Linear-lijst.
- `apps/cockpit/src/app/(dashboard)/inbox/[kind]/[id]/page.tsx` (server component, render `<ConversationPage />`) + `loading.tsx` + `error.tsx` — detail-route. `kind` is `'issue'` of `'question'`. Onbekende combinatie → `notFound()`.

Sidebar:

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
- **Read-state mutation-test** (`packages/database/src/mutations/__tests__/inbox-reads.test.ts`):
  - Eerste call: insert. Tweede call op zelfde `(profile_id, item_kind, item_id)`: update `read_at`. Twee profile_id's: twee aparte rows.
  - RLS: profile A kan profile B's reads niet zien of muteren (test met twee auth-cookies).
- **Activity-trigger-test** (`packages/database/src/__tests__/migrations/client-questions-activity.test.ts`):
  - Insert root → `last_activity_at = created_at`.
  - Insert reply onder root → root's `last_activity_at` updates naar reply's `created_at`. Tweede reply: opnieuw update.
- **Query-test** (`packages/database/src/queries/__tests__/inbox.test.ts`):
  - `listInboxItemsForTeam` returnt items met `isUnread=true` als geen read-row, `false` als `read_at >= activityAt`, `true` als `read_at < activityAt` (na nieuwe reply).
  - Time-grouping logica werkt — `today.length + earlier.length` matcht totaal.
- **Action-tests** (`apps/cockpit/src/features/inbox/actions/__tests__/`):
  - Payload-capture mocks per actie; valideer dat `pmReviewActionSchema` faalt op te-korte decline-reason.
  - Auth-failure → `{ error }`.
  - PM-action calls `markInboxItemRead` voor de actor.
- **Component-tests** (`apps/cockpit/src/features/inbox/components/__tests__/`):
  - `inbox-row.test.tsx` — unread-fixture toont `font-semibold`, read toont `font-medium`. Hover-actions toont vier buttons bij `needs_pm_review`, één bij anders. Status-bullet kleur correct.
  - `inbox-list.test.tsx` — time-grouping correct op fixture met items op verschillende dagen.
  - `inbox-header.test.tsx` — filter-chip klik update URL-param `?filter=`.
  - `conversation-bubbles.test.tsx` — fixture met team-msg + client-msg → team alignment-rechts + primary-bg, client alignment-links + background-bg.
  - `conversation-action-bar.test.tsx` — toont 4 knoppen alleen bij `kind='feedback' && status='needs_pm_review'`. Bij andere statussen: niet renderen.
  - `decline-modal.test.tsx` / `convert-modal.test.tsx` — submit-disabled bij <10 chars; validatie-error inline tonen.
- **Validatie-test** (`packages/database/src/validations/__tests__/issues.test.ts`): vier discriminated-union-paden valideren, vier failure-paden.
- **Constants-test** (`packages/database/src/constants/__tests__/issues.test.ts`): alle nieuwe statussen hebben een label én zitten in een portal-status-groep (geen wees-status). Plus table-driven test op `defaultStatusForSource()` (`portal` → `needs_pm_review`, `userback` → `needs_pm_review`, `jaip_widget` → `needs_pm_review`, `manual` → `triage`, `ai` → `triage`).
- **DevHub-non-regression-test**: laad `apps/devhub/src/app/(app)/issues/page.tsx` met fixture die `needs_pm_review`-issues bevat, valideer dat `UNGROUPED_DEFAULT_OPEN` (regel 29) ze NIET toont. Geen code-wijziging in DevHub nodig — `needs_pm_review` zit niet in de array, dus default-filtered uit. Test borgt dat niemand 'm later toevoegt.

### 12. Sprint-index update

`sprints/backlog/README.md`: voeg een rij toe in de "Open backlog"-tabel:

```
| CC-001   | Cockpit Inbox + PM-review-gate                               | Customer Comm | `sprints/backlog/` | Backlog       |
```

## Acceptatiecriteria

**Schema:**

- [ ] DB-migratie draait clean op een lege en op een gevulde DB; `chk_issues_status` accepteert nu 10 statussen.
- [ ] `decline_reason` (text, nullable) en `converted_to_question_id` (uuid FK met `ON DELETE SET NULL`) bestaan op `issues`.
- [ ] `client_questions.last_activity_at` bestaat met trigger die root-insert + reply-insert correct bijhoudt.
- [ ] `inbox_reads` tabel bestaat met PK `(profile_id, item_kind, item_id)` en RLS "own only".

**Constants & queries:**

- [ ] `ISSUE_STATUSES` + `ISSUE_STATUS_LABELS` + `CLOSED_STATUSES` gesynchroniseerd in `packages/database/src/constants/issues.ts`.
- [ ] `PORTAL_STATUS_GROUPS` mapt vision §5-tabel correct (`needs_pm_review` → "Ontvangen", `declined` → "Afgerond", `deferred` → "Later").
- [ ] `listInboxItemsForTeam` returnt items met `isUnread` correct afgeleid uit `read_at < activityAt`.
- [ ] `getConversationThread` markeert thread automatisch als read voor de current profile.

**Mutations:**

- [ ] `endorseIssue`, `declineIssue`, `deferIssue`, `convertIssueToQuestion` zijn als pure mutations beschikbaar én via cockpit-server-actions aan te roepen.
- [ ] `markInboxItemRead` is idempotent (UPSERT, latere lees overschrijft).

**Cockpit UI — overzicht (`/inbox`):**

- [ ] Linear-stijl rij-rendering matcht `/inbox-preview` mockup: status-bullet links, avatar, sender+project, subject/snippet (`font-semibold` als unread, `font-medium` als gelezen), source-dot, timestamp rechts.
- [ ] Hover-actions verschijnen on-hover (`opacity-0 group-hover:opacity-100`), niet altijd zichtbaar. Voor `needs_pm_review`: 4 icon-buttons. Voor andere: 1 (open detail).
- [ ] Filter-strip toont chips `[Wacht op mij · N]` `[Wacht op klant · N]` `[Geparkeerd · N]`. URL-param `?filter=` werkt; default `wacht_op_mij`.
- [ ] Time-grouping: Vandaag / Eerder deze week / Eerder. Sticky headers met backdrop-blur.
- [ ] Klik op rij (buiten action-area) navigeert naar `/inbox/[kind]/[id]`.

**Cockpit UI — detail (`/inbox/[kind]/[id]`):**

- [ ] Conversation-page rendert iMessage-bubbles: jouw bericht (PM) rechts in `bg-primary text-primary-foreground` met `rounded-tr-md`; ander links in `bg-background` met `rounded-tl-md`.
- [ ] Date-dividers tussen dagen ("Gisteren", "Vandaag").
- [ ] Action-bar bovenaan toont 4 PM-acties **alleen** bij `kind='feedback'` AND `status='needs_pm_review'`. Andere statussen: alleen header + thread + reply-dock.
- [ ] Reply-dock onderaan met paperclip-placeholder + textarea + Verstuur-knop. Helper-tekst toont klant-naam.
- [ ] Bezoek aan detail-page markeert thread als read voor current profile (verifieer via DB-query).

**Sidebar:**

- [ ] Cockpit-sidebar heeft `/inbox` link met live `inboxCount`-badge (totaal aantal unread); `NavItem.badgeKey` type uitgebreid; `(dashboard)/layout.tsx` fetch en prop-passing aangepast.

**Status-flip flows (PM-acties):**

- [ ] Decline-modal forceert reason ≥10 chars vóór submit.
- [ ] Convert-modal forceert vraag ≥10 chars vóór submit.
- [ ] Reply-dock post via `role: "team"` — verifieerd in DB-test.
- [ ] PM-actie markeert het item automatisch als read voor de actor.

**Cross-laag:**

- [ ] Portal-feedback (`/projects/[id]/feedback/new`), widget en Userback-nieuwe inserts landen op `needs_pm_review`, niet meer op `triage`.
- [ ] DevHub `/issues` (filter `UNGROUPED_DEFAULT_OPEN`) toont GEEN `needs_pm_review` issues.
- [ ] Portal-statusbadge toont "Ontvangen" voor `needs_pm_review`, "Later" voor `deferred`, "Afgewezen — {reason}" voor `declined`.

**Build:**

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

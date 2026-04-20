# Sprint COMM-002: Queries, pipeline + RLS op communications

> **Scope-afbakening.** Tweede van drie sprints. Bouwt verder op COMM-001 (communications tabel + dual-write). Deze sprint verschuift de **bron van waarheid** van `meetings`/`emails` naar `communications` voor de gedeelde velden: queries lezen er primair van, de AI-pipeline classificeert via één gedeelde **hybride** helper (rules voor de 95% + LLM alleen voor advisor-subtyping), en RLS-policies verhuizen. Portal-RLS opnieuw verifiëren is de hoogste-risicotaak; **deze sprint dicht ook een bestaande security-gap op `emails` (nu geen portal-RLS)**.

> **Scope-wijziging t.o.v. eerste versie (na assumption-validation):**
>
> - Classifier is **hybrid**, niet pure rules — email-classifier doet nu LLM voor 7 party_types incl. accountant/tax_advisor/lawyer; gatekeeper doet rules voor 4. Unified pure-rule helper kan advisor-subtyping niet.
> - Portal client-access werkt via `meeting_projects/email_projects → project_id → portal_project_access`, **niet** via `communications.organization_id` zoals eerder aangenomen.
> - `emails` hebben momenteel alleen permissive `USING (true)` RLS — elke authenticated user (incl. clients) ziet alles. Deze sprint fixt dat.
> - "Member project-scoped RLS" bestaat niet op meetings/emails; alleen clients worden gefilterd. Out-of-scope voor deze sprint.

## Doel

Na deze sprint:

1. Bestaat één **hybride** `classifyCounterparty()` helper: rules voor de basis (internal/client/partner via organization.type + email-domain match via `organizations.email_domains`) + optionele LLM-call voor advisor-subtyping (accountant/tax_advisor/lawyer). Beide kanalen gebruiken dezelfde helper.
2. Gebruikt de Gatekeeper (meetings) + Email-classifier beide `classifyCounterparty()` → zelfde boekhouder krijgt zelfde `party_type` ongeacht kanaal.
3. Lezen queries die alleen gedeelde velden nodig hebben (dashboard feeds, party_type-filters, AI-pulse) van `communications` via een nieuwe `packages/database/src/queries/communications.ts`.
4. Is extractions verrijkt met `communication_id UUID NULLABLE REFERENCES communications(id)` naast de bestaande `meeting_id`. Email-extractions krijgen idem. Dual-write in inserts.
5. Zijn RLS policies op `communications` fine-grained — admins zien alles, clients zien alleen verified communications waar ze via `meeting_projects`/`email_projects` → `project_id` → `portal_project_access` toegang tot het gelinkte project hebben. Geverifieerd via expliciete portal-regressietest.
6. **Krijgen `emails` nu óók portal-RLS** (parallel aan meetings) — sluit huidige security-gap waar clients alle emails kunnen zien.
7. Zijn meetings + emails RLS policies nog intact voor backward-compat (droppen gebeurt in COMM-003).
8. Heeft de review-flow één gedeelde `verifyCommunication(id, decision)` mutation; bestaande `verifyMeeting()` (in `mutations/review.ts`) en `verifyEmail()` (in `mutations/emails.ts`) delegeren ernaartoe.

**Expliciet niet in scope:**

- UI wijzigingen op `/meetings`, `/emails`, `/review` routes (komt in COMM-003)
- Droppen van gedeelde kolommen op meetings/emails (komt in COMM-003)
- Trigger-verwijdering (komt in COMM-003)
- MCP-tools refactor — blijven voorlopig kanaal-specifiek (later sprint)
- Nieuwe party_types of scopes toevoegen — enum staat vast uit COMM-001

## Requirements

| ID       | Beschrijving                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI-070   | Hybride helper `classifyCounterparty(input: { participants?: ParticipantInfo[], senderEmail?: string, senderDomain?: string })` retourneert `{ party_type, organization_id, unmatched_organization_name, scope }`. Stap 1: rule-based via `organizations.email_domains` + `organizations.type`-mapping. Stap 2: alleen als rules resulteren in party_type `advisor` + er is genoeg context → Haiku-call voor disambiguatie naar `accountant`/`tax_advisor`/`lawyer`/`advisor`. Cached resultaat per sender-domein om kosten laag te houden. |
| AI-071   | Gatekeeper roept `classifyCounterparty()` aan voor meetings en geeft `party_type` + `scope` mee aan Zod schema output. Meeting-type blijft bestaan maar wordt gedecoupled van party_type.                                                                                                                                                                                                                                                                                                                                                   |
| AI-072   | Email-classifier roept `classifyCounterparty()` aan; bestaande party_type logic wordt vervangen door deze helper.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| AI-073   | Unit tests voor `classifyCounterparty()`: boekhouder-email → `accountant`, fiscalist → `tax_advisor`, advisor-org → `advisor`, partner-org → `partner`, onbekende externe → `other`, intern → `internal`.                                                                                                                                                                                                                                                                                                                                   |
| DATA-080 | `extractions.communication_id UUID NULLABLE REFERENCES communications(id) ON DELETE CASCADE`; `email_extractions.communication_id` idem. Backfill via JOIN op bestaande `meeting_id`/`email_id`.                                                                                                                                                                                                                                                                                                                                            |
| DATA-081 | Unique constraint of index op `(communication_id)` voor snelle lookup.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| DATA-082 | Bestaande RPC's `verify_meeting` (uit `20260331000003_atomic_review_rpc.sql`) en `verify_email` worden uitgebreid met een UPDATE op `communications.verification_status` + `verified_by` + `verified_at` binnen dezelfde transactie. **Er bestaat geen `verify_email_extractions` RPC** — email-verify loopt via `verify_email` + directe UPDATE op `email_extractions`.                                                                                                                                                                    |
| DATA-083 | RLS op `communications`: admin ziet alles (`NOT is_client(auth.uid())`), client ziet alleen communications waar `verification_status = 'verified'` EN `EXISTS (SELECT 1 FROM meeting_projects mp WHERE mp.communication_id = communications.id AND has_portal_access(auth.uid(), mp.project_id))` OR idem via `email_projects`. **Niet** via `organization_id`. Member-scoping is out-of-scope (enterprise members zien alles zoals nu).                                                                                                    |
| DATA-084 | **Nieuw: portal-RLS op `emails` + `email_projects` + `email_extractions`** — sluit huidige security-gap. Emails hebben momenteel alleen `USING (true)` policies. Nieuwe policies parallel aan meetings (zie `20260417100002_portal_rls_policies.sql` voor patroon).                                                                                                                                                                                                                                                                         |
| DATA-085 | Policy-level test: `packages/database/__tests__/communications-rls.test.ts` valideert drie rollen (admin/member/client) via patroon uit bestaande `rls-project-access.test.ts` — `auth.admin.createUser` + `signInWithPassword` + queries per rol. Regressie tegen huidige meetings/emails RLS.                                                                                                                                                                                                                                             |
| FUNC-080 | Nieuwe queries in `packages/database/src/queries/communications.ts`: `listCommunications({ channel?, party_type?, verification_status?, organization_id?, limit, offset })`, `getCommunicationById(id)`, `searchCommunications(query, options)`.                                                                                                                                                                                                                                                                                            |
| FUNC-081 | Shared mutation `packages/database/src/mutations/communications.ts`: `verifyCommunication(id, userId, decision)`, `updateCommunicationFields(id, patch)`. Dual-write garandeert consistentie.                                                                                                                                                                                                                                                                                                                                               |
| FUNC-082 | Bestaande `verifyMeeting()` (file: `mutations/review.ts`) + `verifyMeetingWithEdits()` (ook `review.ts`) + `verifyEmail()` + `verifyEmailWithEdits()` (file: `mutations/emails.ts`) delegeren intern naar `verifyCommunication()`. Publieke signature blijft gelijk.                                                                                                                                                                                                                                                                        |
| FUNC-083 | Dashboard + AI-pulse queries worden kanaaloverstijgend: `getAiPulseData()` (nu inline in `queries/dashboard.ts`) wordt herschreven om uit `communications` te tellen. Nieuwe wrapper `listRecentVerifiedCommunications()` vervangt `listRecentVerifiedMeetings()` (laatstgenoemde delegeert ernaartoe met `channel: 'meeting'` filter voor backward-compat).                                                                                                                                                                                |
| FUNC-084 | Search consolidatie: bestaande RPC `search_all_content` (uit `20260329000010_search_functions.sql`) wordt uitgebreid om `communications.embedding` + `search_vector` te lezen i.p.v. `meetings.*`. Geen aparte `searchCommunications` TypeScript functie nodig — wrapper gebruikt de RPC. **Er bestaan geen aparte `search_meetings`/`search_emails` RPCs**, dus migratie is kleiner dan aangenomen.                                                                                                                                        |
| RULE-080 | Alle nieuwe code importeert party_type + scope alleen uit `@repo/ai/validations/communication`. Lint-rule of code-review afspraak.                                                                                                                                                                                                                                                                                                                                                                                                          |

## Taken

### Taak 1: Shared hybrid counterparty-classifier

**Architectuur:** twee-laags.

- **Laag 1 (rule-based, altijd):** bestaande `determinePartyType()` uit `participant-classifier.ts` + `findOrganizationIdByEmailDomain()` uit `queries/organizations.ts` wordt hergebruikt. Output: grove party_type (`internal | client | partner | advisor | other`).
- **Laag 2 (LLM, alleen bij `advisor`):** als laag 1 `advisor` teruggeeft én er is een email-domein of rol-hint, roep Haiku aan met prompt "bepaal uit naam/email/rol welk advisor-subtype: accountant, tax_advisor, lawyer, of generiek advisor". Cache per sender-domein (LRU of Supabase `advisor_subtype_cache`-tabel, TBD in implementatie).

- [ ] Nieuw: `packages/ai/src/lib/classify-counterparty.ts`
  - Input: `{ participants?: ParticipantInfo[], senderEmail?: string, senderDomain?: string }`
  - Returnt `{ party_type, organization_id, unmatched_organization_name, scope }`
  - Hergebruikt `determinePartyType()` uit `participant-classifier.ts` waar mogelijk — niet dupliceren
  - Rule chain laag 1:
    1. Geen externe deelnemers / alleen internal sender → `{ party_type: 'internal', scope: 'internal' }`
    2. Sender/participant domain match met `organizations.email_domains` → map `organizations.type` → party_type: `client → client`, `partner → partner`, `supplier → other` (supplier hoort niet in party_type enum), `advisor → advisor` (generiek, laag 2 verfijnt), `internal → internal`
    3. Geen match → `{ party_type: 'other', unmatched_organization_name: <extracted> }`
  - Laag 2 (advisor-subtyping via Haiku):
    - Alleen triggeren bij `party_type === 'advisor'`
    - Prompt: input = naam, email, optioneel rol-tekst. Output: `'accountant' | 'tax_advisor' | 'lawyer' | 'advisor'`
    - Cache op `senderDomain` of `organization_id` (in-memory LRU, 100 entries is genoeg voor een KMO)
  - `scope` bepaald separaat (buiten party_type): als er een `identified_projects[]` match is vanuit gatekeeper → `scope = 'project'`; party_type internal + geen project → `scope = 'admin'`; party_type advisor/partner + geen project → `scope = 'relationship'`; anders `scope = 'other'`

- [ ] Tests: `packages/ai/__tests__/lib/classify-counterparty.test.ts`
  - Boekhouder-email (domain match op advisor-org + naam "Jan Boekhouder") → `accountant` (laag 2)
  - Fiscalist-email → `tax_advisor` (laag 2)
  - Partner-org email → `partner` (laag 1, geen LLM call)
  - Client-org email → `client` (laag 1)
  - Alleen internal deelnemers → `internal` (laag 1)
  - Onbekende externe → `other` + `unmatched_organization_name` set
  - **Cache hit** — tweede call met zelfde domein roept LLM niet opnieuw aan (mock via `vi.fn()`)
  - Advisor-org zonder rol-hint → `advisor` (laag 2 faalt gracefully)

**Geraakt:** nieuwe file + test + gebruikt bestaande `participant-classifier.ts` + `queries/organizations.ts`.

### Taak 2: Gatekeeper refactor

- [ ] `packages/ai/src/agents/gatekeeper.ts`
  - Voor de LLM-call: bereken `counterparty = classifyCounterparty(...)` synchronisch
  - LLM output blijft `relevance_score, meeting_type, identified_projects` — party_type komt niet meer uit LLM
  - Pipeline schrijft `counterparty.party_type` + `counterparty.organization_id` + `counterparty.scope` naar meeting
- [ ] `packages/ai/src/pipeline/gatekeeper-pipeline.ts`
  - Gebruik helper uit Taak 1 + combineer met gatekeeper output
- [ ] Update snapshot of gedragstests indien nodig, zonder assertions af te zwakken

**Geraakt:** gatekeeper.ts, gatekeeper-pipeline.ts, tests.

### Taak 3: Email-classifier refactor

- [ ] `packages/ai/src/agents/email-classifier.ts` (of wat de huidige file ook heet — check `validations/email-classifier.ts` voor entrypoint)
  - Zelfde substitutie: party_type komt nu uit `classifyCounterparty()`
  - email_type blijft LLM-output
- [ ] `packages/ai/src/pipeline/email-pipeline.ts`
  - Hergebruik helper

**Geraakt:** email agent + pipeline + tests.

### Taak 4: Extractions.communication_id migratie + backfill

- [ ] `supabase/migrations/YYYYMMDD_comm002_extractions_communication_id.sql`
  - `ALTER TABLE extractions ADD COLUMN communication_id UUID REFERENCES communications(id) ON DELETE CASCADE`
  - `ALTER TABLE email_extractions ADD COLUMN communication_id UUID REFERENCES communications(id) ON DELETE CASCADE`
  - Backfill: `UPDATE extractions SET communication_id = (SELECT communication_id FROM meetings WHERE meetings.id = extractions.meeting_id)` + idem voor emails
  - Index op beide
- [ ] Mutations `createExtraction()` + `createEmailExtraction()` vullen nu beide kolommen

**Geraakt:** nieuwe migratie, mutations/extractions.ts, mutations/email-extractions.ts.

### Taak 5: Communications queries

- [ ] Nieuw: `packages/database/src/queries/communications.ts`
  - `listCommunications()` met filters
  - `getCommunicationById()`
  - `searchCommunications()` (hybrid semantic + tsvector)
  - `listRecentVerifiedCommunications()` voor dashboard
  - `countOpenReviewItems()` voor AI-pulse
- [ ] Gedragstests met `describeWithDb`

**Geraakt:** nieuwe queries file + tests.

### Taak 6: Communications mutations + delegatie

**Correctie na validatie:** `verifyMeeting()` woont in `packages/database/src/mutations/review.ts` (niet `mutations/meetings.ts`). `verifyEmail()` + `verifyEmailWithEdits()` wonen wél in `mutations/emails.ts`. Asymmetrie bewaren of harmoniseren is een nevenkeuze — voor deze sprint laten staan, alleen delegate toevoegen.

- [ ] Nieuw: `packages/database/src/mutations/communications.ts`
  - `verifyCommunication(client, id, userId, decision, edits?)` — UPDATE communications + laat dual-write trigger meetings/emails synchroniseren
  - `updateCommunicationFields(client, id, patch)` — voor correcties tijdens review (party_type wijzigen, organization_id koppelen)
- [ ] Refactor `mutations/review.ts::verifyMeeting()` + `verifyMeetingWithEdits()` → delegate naar `verifyCommunication()`. Roept intern bestaande RPC `verify_meeting` aan én `verifyCommunication()` voor communications-side UPDATE, in één transactie via Supabase RPC-wrapper.
- [ ] Refactor `mutations/emails.ts::verifyEmail()` + `verifyEmailWithEdits()` → idem via `verify_email` RPC + `verifyCommunication()`.
- [ ] Publieke API signatures blijven gelijk.

**Dual-write strategie (gekozen Optie B uit eerste versie):**

Dual-write werkt `meetings → communications` via COMM-001 trigger. Omgekeerd niet. De mutation doet expliciet beide UPDATEs in één transactie:

```
BEGIN
  UPDATE communications SET verification_status=..., verified_by=..., verified_at=... WHERE id=$comm_id
  CALL verify_meeting($meeting_id, $user_id, $edits)  -- bestaande RPC, raakt meetings + extractions
COMMIT
```

Minder trigger-magie, makkelijker debuggen. Reverse-trigger kan later in COMM-003 als we zien dat we 'm nodig hebben.

**Geraakt:** nieuwe mutations file, `mutations/review.ts`, `mutations/emails.ts`, tests.

### Taak 7: RLS op communications + portal-gap op emails dichten

**Kritieke bevinding uit validatie:**

- Portal client-access werkt via `meeting_projects → project_id → portal_project_access`, **niet** via `organization_id`. Parallel voor emails via `email_projects`.
- `emails` + `email_projects` + `email_extractions` hebben nu alleen `USING (true)` — clients kunnen ALLES zien. Deze sprint dicht dat.
- "Member ziet project-scoped" bestaat niet op meetings/emails — is out-of-scope.

- [ ] Migratie `supabase/migrations/YYYYMMDD_comm002_communications_rls.sql`
  - Drop permissive policies op `communications` uit COMM-001
  - Hergebruik bestaande helpers: `is_client(auth.uid())` en `has_portal_access(user, project_id)` uit `20260417100002_portal_rls_policies.sql`
  - Nieuwe policies op `communications`:
    - **SELECT**: `NOT is_client(auth.uid())` OR (`verification_status = 'verified'` AND (`EXISTS (SELECT 1 FROM meeting_projects mp JOIN meetings m ON m.id = mp.meeting_id WHERE m.communication_id = communications.id AND has_portal_access(auth.uid(), mp.project_id))` OR idem voor `email_projects`))
    - **INSERT/UPDATE/DELETE**: `NOT is_client(auth.uid())` — clients mogen niet muteren

- [ ] Migratie `supabase/migrations/YYYYMMDD_comm002_emails_portal_rls.sql` **(nieuw, sluit security-gap)**
  - Drop permissive policies op `emails`, `email_projects`, `email_extractions`
  - Nieuwe policies analoog aan `20260417100002_portal_rls_policies.sql` voor meetings:
    - `emails`: client ziet verified + project-toegang via `email_projects`
    - `email_projects`: client ziet rijen waar `has_portal_access(auth.uid(), project_id)`
    - `email_extractions`: client ziet rijen via JOIN op `emails` + `email_projects`

- [ ] Optioneel: `portal_communications` view met `WITH (security_invoker = true)` (zelfde patroon als `portal_meetings` uit `20260417100003`). Alleen bouwen als meerdere queries dezelfde client-scoping nodig hebben.

- [ ] Test `packages/database/__tests__/communications-rls.test.ts`
  - Patroon overnemen van `rls-project-access.test.ts` (`auth.admin.createUser` + `signInWithPassword`)
  - Drie test-users: admin, member, client
  - Per user: SELECT op `communications`, assert zichtbaarheid matcht verwachting
  - Inclusief regressie: email-rijen — client ziet ALLEEN emails waar project-toegang én verified

**Geraakt:** 2 migraties, nieuwe test file.

### Taak 8: Dashboard/AI-pulse queries migreren naar communications

**Validatie-correctie:** `getAiPulseData()` staat al **inline** in `queries/dashboard.ts` (regel 188-219), geen dedicated tabel. `listRecentVerifiedMeetings()` + `listBriefingMeetings()` ook in `queries/dashboard.ts`. Refactor is kleiner dan ingeschat.

- [ ] Refactor `packages/database/src/queries/dashboard.ts`:
  - `listRecentVerifiedMeetings()` → herleiden naar `listRecentVerifiedCommunications({ channel: 'meeting', limit })` + JOIN `meetings` voor kanaal-velden
  - `listBriefingMeetings()` → idem, lees verified_at + organization via communications
  - `getAiPulseData()` → COUNTs via `communications` ipv `meetings` voor "verified in 7d"; extractions counts blijven op extractions-tabel
- [ ] Geen UI-wijziging nodig — queries retourneren nog kanaal-specifieke shape via join met meetings/emails voor channel-only velden (transcript, body_text)
- [ ] Behoud bestaande publieke signatures zodat dashboard-componenten ongewijzigd blijven

**Geraakt:** `queries/dashboard.ts` + tests.

### Taak 9: Review-mutations integreren

- [ ] `apps/cockpit/src/actions/review.ts` + `email-review.ts`: update om de nieuwe shared mutations te gebruiken, behoud oude signatures voor UI
- [ ] Regressietest: review-flow klikpad (goedkeuren meeting, goedkeuren email) werkt ongewijzigd

**Geraakt:** cockpit actions + integratietests.

## Acceptatiecriteria

- [ ] Gedragstest: meeting met een boekhouder-domein krijgt `party_type='accountant'`. Email van dezelfde boekhouder krijgt ook `party_type='accountant'`. Geen drift meer.
- [ ] Hybride classifier: boekhouder-domein triggert laag 2 (Haiku-call) één keer, tweede call op zelfde domein is cache-hit (verified via mock).
- [ ] Portal-RLS regressietest groen: client ziet verified + project-toegang; geen verandering t.o.v. vóór refactor voor meetings.
- [ ] **Emails portal-RLS gap gedicht**: test-client ziet géén emails meer waar géén project-access op is. Vóór de sprint: ALLE emails zichtbaar. Na de sprint: alleen project-gescopte + verified.
- [ ] Admin ziet alles (`NOT is_client()`). Member-scoping is niet veranderd (blijft "ziet alles") — expliciet genoteerd, out-of-scope.
- [ ] Dashboard + review-UI tonen identieke data (visual regressie via screenshot-check of handmatig).
- [ ] `npm run type-check`, `npm run lint`, `npm run build` slagen.
- [ ] Contract-test uit COMM-001 blijft groen.
- [ ] `npm test` — geen regressie, nieuwe tests (+25: RLS meetings + RLS emails + classify-counterparty + communications queries + verify delegation).
- [ ] Handmatig: nieuwe meeting die in gatekeeper-pipeline loopt → communications row heeft correcte party_type + scope, meetings row idem (via dual-write).

## Risico's

- **Portal-RLS regressie op meetings** — hoogste risico. Mitigatie: expliciete regressietest vóór merge, preview-deploy testen met 2+ client-accounts, rollback-plan klaar (policies teruggedraaid).
- **Emails portal-RLS introductie** — nieuw risico. Clients zien nu alles; na sprint zien ze minder. Mitigatie: run test-query vóór + na de migratie om te zien welke email-rijen elke client verliest. Document welke clients productie-data hebben en of ze al emails zien in hun UI.
- **Dual-write consistency** — communications update via mutation, meetings via trigger. Race conditions? Mitigatie: mutation draait in één transactie, trigger is `AFTER UPDATE` dus volgt in dezelfde transactie.
- **Extractions backfill** — veel rows, grote migratie. Mitigatie: batch met `WHERE communication_id IS NULL`, rollout buiten piek.
- **Hybride classifier kosten** — laag 2 roept Haiku aan per nieuw advisor-domein. Mitigatie: in-memory LRU cache + expliciet opslaan van subtype op `organizations` zodat hergebruik geen LLM-call nodig heeft. Monitor kosten in eerste week na deploy.
- **Laag 2 LLM-uitval** — als Haiku faalt, fallback naar generiek `advisor`. Nooit blokkerend.

## Bronverwijzingen

- Sprint COMM-001: `sprints/backlog/sprint-COMM-001-supertype-dual-write.md`
- `supabase/migrations/20260417100002_portal_rls_policies.sql` — patroon voor RLS
- `packages/ai/src/agents/gatekeeper.ts` (huidige flow)
- `packages/ai/src/validations/email-classifier.ts` (huidige email classifier)
- `supabase/migrations/20260414120000_organizations_email_domains.sql` — email_domains kolom
- `docs/security/audit-report.md` — huidige RLS staat
- `packages/database/src/__tests__/` — bestaande `describeWithDb` test patroon

## Vervolg

- **COMM-003**: UI refactor, oude kolommen op meetings/emails GENERATED/dropped, triggers weg, review queue unified in UI, eventueel portal communication views.

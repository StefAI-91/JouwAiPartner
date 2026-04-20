# Sprint COMM-002: Queries, pipeline + RLS op communications

> **Scope-afbakening.** Tweede van drie sprints. Bouwt verder op COMM-001 (communications tabel + dual-write). Deze sprint verschuift de **bron van waarheid** van `meetings`/`emails` naar `communications` voor de gedeelde velden: queries lezen er primair van, de AI-pipeline classificeert via één gedeelde helper, en RLS-policies verhuizen. Portal-RLS opnieuw verifiëren is de hoogste-risicotaak.

## Doel

Na deze sprint:

1. Bestaat één `classifyCounterparty()` helper die voor beide kanalen uit deelnemers/afzender-info `party_type` + `organization_id` + `scope` afleidt op basis van gedeelde regels (organization.type → party_type mapping, email-domain match, etc.).
2. Gebruikt de Gatekeeper (meetings) + Email-classifier beide `classifyCounterparty()` → zelfde boekhouder krijgt zelfde `party_type` ongeacht kanaal.
3. Lezen queries die alleen gedeelde velden nodig hebben (dashboard feeds, party_type-filters, AI-pulse) van `communications` via een nieuwe `packages/database/src/queries/communications.ts`.
4. Is extractions verrijkt met `communication_id UUID NULLABLE REFERENCES communications(id)` naast de bestaande `meeting_id`. Email-extractions krijgen idem. Dual-write in inserts.
5. Zijn RLS policies op `communications` fine-grained, inclusief portal-toegang (admin/member/client) — geverifieerd via een expliciete portal-regressietest.
6. Zijn meetings + emails RLS policies nog intact voor backward-compat (droppen gebeurt in COMM-003).
7. Heeft de review-flow één gedeelde `verifyCommunication(id, decision)` mutation; bestaande `verifyMeeting()`/`verifyEmail()` delegeren ernaartoe.

**Expliciet niet in scope:**

- UI wijzigingen op `/meetings`, `/emails`, `/review` routes (komt in COMM-003)
- Droppen van gedeelde kolommen op meetings/emails (komt in COMM-003)
- Trigger-verwijdering (komt in COMM-003)
- MCP-tools refactor — blijven voorlopig kanaal-specifiek (later sprint)
- Nieuwe party_types of scopes toevoegen — enum staat vast uit COMM-001

## Requirements

| ID       | Beschrijving                                                                                                                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI-070   | Helper `classifyCounterparty(input: { participants?: ParticipantInfo[], senderEmail?: string, senderDomain?: string, knownOrganizations: Organization[] })` retourneert `{ party_type, organization_id, unmatched_organization_name, scope }`. Geen LLM call — pure rule-based. |
| AI-071   | Gatekeeper roept `classifyCounterparty()` aan voor meetings en geeft `party_type` + `scope` mee aan Zod schema output. Meeting-type blijft bestaan maar wordt gedecoupled van party_type.                                                                                       |
| AI-072   | Email-classifier roept `classifyCounterparty()` aan; bestaande party_type logic wordt vervangen door deze helper.                                                                                                                                                               |
| AI-073   | Unit tests voor `classifyCounterparty()`: boekhouder-email → `accountant`, fiscalist → `tax_advisor`, advisor-org → `advisor`, partner-org → `partner`, onbekende externe → `other`, intern → `internal`.                                                                       |
| DATA-080 | `extractions.communication_id UUID NULLABLE REFERENCES communications(id) ON DELETE CASCADE`; `email_extractions.communication_id` idem. Backfill via JOIN op bestaande `meeting_id`/`email_id`.                                                                                |
| DATA-081 | Unique constraint of index op `(communication_id)` voor snelle lookup.                                                                                                                                                                                                          |
| DATA-082 | Verify-RPC's (`verify_meeting_extractions`, `verify_email_extractions`) krijgen een extra SELECT op `communications.verification_status` + UPDATE via dual-write. Geen nieuwe RPC — bestaande uitbreiden.                                                                       |
| DATA-083 | RLS op `communications`: policy per role (admin/member/client) zelfde als huidige portal policies op meetings. Client-rol ziet alleen communications waar organization_id matcht met hun `portal_project_access`.                                                               |
| DATA-084 | Policy-level test: `packages/database/src/__tests__/communications-rls.test.ts` valideert alle drie rollen zien wat ze moeten zien — geregresseerd tegen de huidige meetings/emails RLS.                                                                                        |
| FUNC-080 | Nieuwe queries in `packages/database/src/queries/communications.ts`: `listCommunications({ channel?, party_type?, verification_status?, organization_id?, limit, offset })`, `getCommunicationById(id)`, `searchCommunications(query, options)`.                                |
| FUNC-081 | Shared mutation `packages/database/src/mutations/communications.ts`: `verifyCommunication(id, userId, decision)`, `updateCommunicationFields(id, patch)`. Dual-write garandeert consistentie.                                                                                   |
| FUNC-082 | Bestaande `verifyMeeting()` / `verifyEmail()` / rejection mutations delegeren intern naar `verifyCommunication()` — publieke signature blijft gelijk.                                                                                                                           |
| FUNC-083 | Dashboard + AI-pulse queries (`listRecentVerifiedCommunications`, `countOpenReviewItems`) worden kanaaloverstijgend — één query voor beide feeds.                                                                                                                               |
| RULE-080 | Alle nieuwe code importeert party_type + scope alleen uit `@repo/ai/validations/communication`. Lint-rule of code-review afspraak.                                                                                                                                              |

## Taken

### Taak 1: Shared counterparty-classifier

- [ ] Nieuw: `packages/ai/src/lib/classify-counterparty.ts`
  - Input: `{ participants?: ParticipantInfo[], senderEmail?: string, senderDomain?: string }`
  - Laadt organizations met `type` en `email_domains` via admin client
  - Rule chain:
    1. Geen externe deelnemers → `{ party_type: 'internal', scope: 'internal' }`
    2. Sender/participant domain match met `organizations.email_domains` → map `organizations.type` naar party_type
    3. Organization.type-mapping: `client → client`, `partner → partner`, `supplier → supplier`, `advisor + role heuristiek (email bevat 'boekhouder' of 'fiscalist') → accountant/tax_advisor/lawyer/advisor`, `internal → internal`
    4. Geen match → `{ party_type: 'other', unmatched_organization_name: <extracted> }`
  - Output: `{ party_type, organization_id, unmatched_organization_name, scope }`
  - Pure function, geen side effects behalve DB-lookup van organizations

- [ ] Tests: `packages/ai/src/lib/__tests__/classify-counterparty.test.ts`
  - Alle 6 scenario's uit AI-073

**Geraakt:** nieuwe file + test.

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

- [ ] Nieuw: `packages/database/src/mutations/communications.ts`
  - `verifyCommunication(client, id, userId, decision)` — UPDATE communications + laat dual-write trigger meetings/emails synchroniseren
  - `updateCommunicationFields(client, id, patch)` — voor correcties tijdens review (party_type wijzigen, organization_id koppelen)
- [ ] Refactor `mutations/meetings.ts::verifyMeeting()` + `mutations/emails.ts::verifyEmail()` → delegate naar `verifyCommunication()`. Publieke API blijft gelijk.

**Let op:** dual-write werkt meetings → communications. Omgekeerd (communications → meetings) is **niet** geïnstalleerd in COMM-001. Keuze in deze taak:

- **Optie A:** extra reverse-trigger communications → meetings voor gedeelde velden. Consistenter maar risico op recursie.
- **Optie B:** `verifyCommunication()` doet expliciet UPDATE op communications + meetings/emails in één transactie. Simpeler, maar twee write-paden.

Voor deze sprint: **kies Optie B** — expliciete dual-write in de mutation. Minder trigger-magie, makkelijker debuggen. Reverse-trigger kan later in COMM-003.

**Geraakt:** nieuwe mutations file, mutations/meetings.ts, mutations/emails.ts, tests.

### Taak 7: RLS op communications + portal

- [ ] Migratie `supabase/migrations/YYYYMMDD_comm002_communications_rls.sql`
  - Drop permissive policy uit COMM-001
  - Nieuwe policies voor `authenticated`:
    - Admin ziet alles
    - Member ziet alles waar ze project-access op hebben via existing `project_access` tabel (via extractions/meeting_projects links) — exact patroon van `20260417100002_portal_rls_policies.sql`
    - Client ziet alleen `communications` waar organization_id matcht hun portal-toegang en verification_status = 'verified'
- [ ] Test `packages/database/src/__tests__/communications-rls.test.ts`
  - Drie test-users (admin, member, client) + verwachte zichtbaarheid
  - Vergelijk resultaten met huidige meetings-RLS-regressie

**Geraakt:** nieuwe migratie, nieuwe test file.

### Taak 8: Dashboard/AI-pulse queries migreren naar communications

- [ ] Refactor bestaande dashboard queries (zoek in `packages/database/src/queries/dashboard.ts` / equivalent)
  - "Recente verified meetings" → `listRecentVerifiedCommunications({ channel: 'meeting' })`
  - AI-pulse counts → nieuwe geünificeerde query
- [ ] Geen UI-wijziging nodig — queries retourneren nog kanaal-specifieke shape via join met meetings/emails voor channel-only velden (transcript, body_text)

**Geraakt:** dashboard queries + tests.

### Taak 9: Review-mutations integreren

- [ ] `apps/cockpit/src/actions/review.ts` + `email-review.ts`: update om de nieuwe shared mutations te gebruiken, behoud oude signatures voor UI
- [ ] Regressietest: review-flow klikpad (goedkeuren meeting, goedkeuren email) werkt ongewijzigd

**Geraakt:** cockpit actions + integratietests.

## Acceptatiecriteria

- [ ] Gedragstest: meeting met een boekhouder-domein krijgt `party_type='accountant'`. Email van dezelfde boekhouder krijgt ook `party_type='accountant'`. Geen drift meer.
- [ ] Portal-RLS regressietest groen: client ziet exact dezelfde meetings/emails als vóór de refactor.
- [ ] Admin ziet alles, member ziet project-scoped.
- [ ] Dashboard + review-UI tonen identieke data (visual regressie via screenshot-check of handmatig).
- [ ] `npm run type-check`, `npm run lint`, `npm run build` slagen.
- [ ] Contract-test uit COMM-001 blijft groen.
- [ ] `npm test` — geen regressie, nieuwe tests in +20 (RLS + classify-counterparty + communications queries).
- [ ] Handmatig: nieuwe meeting die in gatekeeper-pipeline loopt → communications row heeft correcte party_type + scope, meetings row idem (via dual-write).

## Risico's

- **Portal-RLS regressie** — hoogste risico. Mitigatie: expliciete regressietest vóór merge, preview-deploy testen met 2+ client-accounts, rollback-plan klaar (policies teruggedraaid).
- **Dual-write consistency** — communications update via mutation, meetings via trigger. Race conditions? Mitigatie: mutation draait in één transactie, trigger is `AFTER UPDATE` dus volgt in dezelfde transactie.
- **Extractions backfill** — veel rows, grote migratie. Mitigatie: batch met `WHERE communication_id IS NULL`, rollout buiten piek.
- **classifyCounterparty heuristieken** — advisor-subtyping (accountant vs tax_advisor) is fuzzy. Start conservatief: default naar `advisor`, specifieker alleen bij duidelijke email-domain/role match. Laat ruimte voor handmatige correctie in UI.

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

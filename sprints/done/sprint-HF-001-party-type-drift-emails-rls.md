# Sprint HF-001: Party-type drift + emails portal-RLS hotfix

> **Status: HOTFIX.** Kleine, snel uitvoerbare sprint die twee concrete problemen oplost: (1) drift tussen `meetings.party_type` (4 waardes) en `emails.party_type` (7 waardes), en (2) bestaande security-gap waar clients alle emails kunnen zien (permissive `USING (true)` RLS). Vervangt de grote 3-sprint COMM-refactor die naar `docs/refactor-ideas/` verhuisd is.

## Doel

Na deze sprint:

1. Bestaat één `PARTY_TYPES` enum in `packages/ai/src/validations/communication.ts` — 8 waardes (`internal, client, partner, accountant, tax_advisor, lawyer, advisor, other`). `supplier` hoort NIET in party_type (zit alleen in `organizations.type`).
2. Zijn CHECK constraints op `meetings.party_type` en `emails.party_type` verbreed naar dezelfde 8-waarden unie.
3. Hebben `emails`, `email_projects` en `email_extractions` **portal-RLS policies** parallel aan meetings — clients zien alleen verified emails waarvan ze via `email_projects` → `project_id` → `portal_project_access` toegang hebben.
4. Bestaat een contract-test die in CI faalt als de CHECK constraint niet matcht met de TS enum — drift-preventie structureel ingebouwd.
5. Bevat de email-classifier een rule-based party_type check via `organizations.email_domains` vóór de LLM-call, zodat bekende boekhouders/fiscalisten consistent gelabeld worden zonder LLM-cost. (Optioneel — toevoegen als quick win.)

**Expliciet niet in scope:**

- Communications supertype (staat in `docs/refactor-ideas/`)
- Party_type in gatekeeper naar 7-typen brengen — blijft voorlopig 4-typen (rule-based)
- UI-wijzigingen
- Member-scoping op emails (bestaat niet op meetings; out-of-scope)

## Requirements

| ID       | Beschrijving                                                                                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FUNC-100 | Nieuw bestand `packages/ai/src/validations/communication.ts` exporteert `PARTY_TYPES` (8 waardes) als `as const` tuple + `PartyType` type + Zod-schema.                                                                  |
| FUNC-101 | `packages/ai/src/validations/gatekeeper.ts` en `packages/ai/src/validations/email-classifier.ts` importeren `PARTY_TYPES` uit de nieuwe shared file (geen lokale duplicatie meer).                                       |
| DATA-100 | Migratie: `meetings.party_type` CHECK constraint verbreed van 4 naar 8 waardes. Oude rijen blijven geldig.                                                                                                               |
| DATA-101 | Migratie: `emails.party_type` CHECK constraint verbreed van 7 naar 8 waardes (`advisor` toegevoegd). Oude rijen blijven geldig.                                                                                          |
| DATA-102 | Migratie: `emails` portal-RLS — DROP permissive policies, nieuwe policies parallel aan `20260417100002_portal_rls_policies.sql` voor meetings. Client ziet verified + project-toegang via `email_projects`.              |
| DATA-103 | Migratie: `email_projects` portal-RLS — client ziet rijen waar `has_portal_access(auth.uid(), project_id)`. Admin/member zien alles.                                                                                     |
| DATA-104 | Migratie: `email_extractions` portal-RLS — client ziet rijen via JOIN `emails` + `email_projects`. Admin/member zien alles.                                                                                              |
| AI-100   | Email-classifier (`packages/ai/src/agents/email-classifier.ts`) krijgt een rule-based party_type-check vóór de LLM-call: match sender-domein tegen `organizations.email_domains` + gebruik `organizations.type`-mapping. |
| RULE-100 | Contract-test `packages/database/__tests__/party-type-drift.test.ts` leest CHECK constraints uit `meetings` + `emails` via `information_schema` en vergelijkt met `PARTY_TYPES` uit TS. Faalt bij drift.                 |
| RULE-101 | Portal-RLS regressietest `packages/database/__tests__/emails-rls.test.ts` valideert dat client ALLEEN project-gescopte verified emails ziet. Volgt patroon van bestaande `rls-project-access.test.ts`.                   |

## Taken

### Taak 1: Shared `communication.ts` validations

- [ ] Nieuw: `packages/ai/src/validations/communication.ts`
  ```typescript
  import { z } from "zod";
  export const PARTY_TYPES = [
    "internal",
    "client",
    "partner",
    "accountant",
    "tax_advisor",
    "lawyer",
    "advisor",
    "other",
  ] as const;
  export type PartyType = (typeof PARTY_TYPES)[number];
  export const PartyTypeSchema = z.enum(PARTY_TYPES);
  ```
- [ ] Refactor `packages/ai/src/validations/gatekeeper.ts` — verwijder lokale `PARTY_TYPES` (regel 18-19), importeer uit shared file
- [ ] Refactor `packages/ai/src/validations/email-classifier.ts` — verwijder lokale party_type-enum, importeer uit shared file
- [ ] Type-check moet groen blijven

**Geraakt:**

- `packages/ai/src/validations/communication.ts` (nieuw)
- `packages/ai/src/validations/gatekeeper.ts`
- `packages/ai/src/validations/email-classifier.ts`

### Taak 2: Migratie — verbreed CHECK constraints

- [ ] `supabase/migrations/YYYYMMDD_hf001_align_party_type.sql`

  ```sql
  -- Meetings: van 4 naar 8 waardes
  ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_party_type_check;
  ALTER TABLE meetings ADD CONSTRAINT meetings_party_type_check CHECK (
    party_type IS NULL OR party_type IN (
      'internal', 'client', 'partner',
      'accountant', 'tax_advisor', 'lawyer', 'advisor',
      'other'
    )
  );

  -- Emails: van 7 naar 8 waardes (advisor toegevoegd)
  ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_party_type_check;
  ALTER TABLE emails ADD CONSTRAINT emails_party_type_check CHECK (
    party_type IS NULL OR party_type IN (
      'internal', 'client', 'partner',
      'accountant', 'tax_advisor', 'lawyer', 'advisor',
      'other'
    )
  );
  ```

- [ ] Geen data-migratie nodig — oude waardes blijven geldig

**Geraakt:** nieuwe migratie.

### Taak 3: Migratie — portal-RLS op emails (kritieke security-fix)

- [ ] `supabase/migrations/YYYYMMDD_hf001_emails_portal_rls.sql`
  - Template uit `supabase/migrations/20260417100002_portal_rls_policies.sql` (sectie voor meetings)
  - Hergebruik bestaande helpers `is_client(auth.uid())` en `has_portal_access(user, project_id)`
  - Drop permissive policies op `emails`, `email_projects`, `email_extractions`
  - **emails policies:**

    ```sql
    -- SELECT
    CREATE POLICY "Emails: select (non-client)" ON emails
      FOR SELECT TO authenticated
      USING (NOT is_client(auth.uid()));

    CREATE POLICY "Emails: select (clients: verified + portal projects)" ON emails
      FOR SELECT TO authenticated
      USING (
        is_client(auth.uid())
        AND verification_status = 'verified'
        AND EXISTS (
          SELECT 1 FROM email_projects ep
          WHERE ep.email_id = emails.id
            AND has_portal_access(auth.uid(), ep.project_id)
        )
      );

    -- INSERT/UPDATE/DELETE — alleen admin/member
    CREATE POLICY "Emails: write (non-client)" ON emails
      FOR ALL TO authenticated
      USING (NOT is_client(auth.uid()))
      WITH CHECK (NOT is_client(auth.uid()));
    ```

  - **email_projects policies:** vergelijkbaar met `meeting_projects` RLS uit dezelfde migratie
  - **email_extractions policies:** JOIN via email_projects → has_portal_access

**Geraakt:** nieuwe migratie.

### Taak 4: Rule-based party_type in email-classifier (quick win)

- [ ] `packages/ai/src/agents/email-classifier.ts`:
  - Vóór de LLM-call: check of `senderDomain` matcht met een `organizations.email_domains` (query bestaat al als `findOrganizationIdByEmailDomain()` in `queries/organizations.ts`)
  - Als match: map `organizations.type` naar party_type volgens deze tabel:
    | organizations.type | party_type (fallback) |
    | ------------------ | --------------------- |
    | internal | internal |
    | client | client |
    | partner | partner |
    | supplier | other |
    | advisor | advisor (LLM mag specificeren naar accountant/tax_advisor/lawyer) |
    | other | other |
  - Geef deze seed mee aan de LLM als "tentative party_type" — LLM kan specificeren (advisor → accountant) maar mag niet afwijken naar iets volledig anders
- [ ] Test: email van bekende boekhouder-domein → `accountant` (als LLM dat pakt) of `advisor` fallback; nooit `client` of `partner`

**Geraakt:** `packages/ai/src/agents/email-classifier.ts` + tests.

### Taak 5: Contract-test drift-preventie

- [ ] `packages/database/__tests__/party-type-drift.test.ts`
  - Query `information_schema.check_constraints` voor `meetings_party_type_check` en `emails_party_type_check`
  - Parse de enum-waardes uit de constraint-string
  - Assert dat beide sets **exact** matchen met `PARTY_TYPES` uit `@repo/ai/validations/communication`
  - Gebruikt `describeWithDb` helper
  - Faalt bij drift — rode CI build

**Geraakt:** nieuwe test file.

### Taak 6: Portal-RLS regressietest op emails

- [ ] `packages/database/__tests__/emails-rls.test.ts`
  - Patroon overnemen van `packages/database/__tests__/rls-project-access.test.ts`
  - `beforeAll`: 3 test-users via `auth.admin.createUser` (admin, member, client)
  - Client krijgt `portal_project_access` op project X
  - Seed: 2 emails — één gelinkt aan project X (via email_projects), één aan project Y
  - Test-scenarios:
    - Admin ziet beide emails
    - Member ziet beide emails
    - Client ziet ALLEEN de verified email gelinkt aan project X
    - Client probeert INSERT op emails → blocked

**Geraakt:** nieuwe test file.

### Taak 7: Pre-deploy security-audit

- [ ] Voordat je de portal-RLS migratie deployt: run query in staging met test-client-account en list welke emails die client momenteel kan zien. Na migratie: idem, en verifieer dat alleen project-gescopte verified emails overblijven.
- [ ] Documenteer in PR-description welke emails elke bestaande portal-client verliest (meestal niks omdat portal nog in preview is).

**Geraakt:** handmatige check, geen code.

## Acceptatiecriteria

- [ ] `npm run type-check` slaagt
- [ ] `npm test` slaagt — nieuwe tests: party-type-drift + emails-rls + email-classifier rule-based
- [ ] Contract-test faalt aantoonbaar bij gesimuleerde drift (bv. voeg waarde toe aan TS enum maar niet aan CHECK → rood)
- [ ] Portal-RLS regressietest: client ziet géén emails buiten hun projecten
- [ ] Admin/member functionaliteit ongewijzigd — bestaande tests groen
- [ ] Handmatige rooktest staging: nieuwe meeting/email met boekhouder-domein → party_type is consistent tussen kanalen (minimaal `advisor`, ideaal `accountant`)
- [ ] Vóór deploy naar productie: audit welke portal-clients emails zagen die ze na de migratie niet meer zien — geen verrassingen voor bestaande gebruikers

## Risico's

- **Portal-RLS op emails introductie** — clients zien nu alles; na sprint zien ze minder. Mitigatie: run audit-query vóór deploy. Als portal nog in preview is (geen echte clients actief): laag risico.
- **LLM-prompt drift door rule-based seed** — bestaande email-classifier prompt verwacht LLM maakt party_type-keuze zelf. Als we een seed meegeven, kan de output anders worden. Mitigatie: seed als `tentative`-hint formuleren, prompt checken met 10 test-emails vóór merge.
- **Contract-test flakiness** — `information_schema` query's kunnen cache-achtig gedrag vertonen. Mitigatie: gebruik admin client in test, geen caching.

## Bronverwijzingen

- `supabase/migrations/20260329000005_meetings.sql` (meetings base, party_type CHECK)
- `supabase/migrations/20260408000009_email_type_party_type.sql` (emails party_type enum)
- `supabase/migrations/20260417100002_portal_rls_policies.sql` (meetings portal-RLS patroon)
- `supabase/migrations/20260414120000_organizations_email_domains.sql` (email_domains kolom)
- `packages/ai/src/validations/gatekeeper.ts` (huidige `PARTY_TYPES` lokaal)
- `packages/ai/src/validations/email-classifier.ts` (huidige party_type enum lokaal)
- `packages/ai/src/pipeline/participant-classifier.ts::determinePartyType()` (bestaande rule-based logica)
- `packages/database/queries/organizations.ts::findOrganizationIdByEmailDomain()` (bestaande domain-lookup)
- `packages/database/__tests__/rls-project-access.test.ts` (test-patroon)
- `packages/database/__tests__/helpers/describe-with-db.ts` (test-helper)
- `docs/refactor-ideas/COMM-001-supertype-dual-write.md` (het grote alternatief — niet nu)

## Vervolg

Na deze sprint heb je:

- **Drift structureel onmogelijk** — contract-test blokkeert het
- **Security-gap dicht** — emails hebben dezelfde portal-RLS als meetings
- **Ruimte voor Sprint 030** (organization page) — waar boekhouder/fiscalist/partner per organisatie terugvindbaar worden

Geen 3-sprint refactor nodig. Als over 6 maanden een derde kanaal (Slack/Rinkel/support-chat) erbij komt én drift opnieuw pijnlijk wordt: pak `docs/refactor-ideas/COMM-001` erbij.

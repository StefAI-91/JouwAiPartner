# Sprint COMM-001: Communications supertype + dual-write (non-breaking)

> **Scope-afbakening.** Eerste van drie sprints die `meetings` en `emails` samenbrengen onder één `communications` supertype zodat party_type, organization_id, verification-flow en relevance_score nooit meer tussen kanalen kunnen driften. Deze sprint is puur additief: nieuwe tabel, backfill, dual-write triggers. Queries, pipeline en UI blijven werken op de bestaande kolommen — ongewijzigd gedrag.

## Doel

Na deze sprint:

1. Bestaat tabel `communications` met **13 gedeelde kolommen** (party_type, organization_id, unmatched_organization_name, occurred_at, relevance_score, verification_status, verified_by, verified_at, embedding, embedding_stale, search_vector, created_at, updated_at) **+ 1 nieuwe kolom** `scope` (enum `project | relationship | internal | admin | other`) die alleen op communications leeft en via heuristiek/Gatekeeper gevuld wordt.
2. Hebben `meetings` en `emails` allebei een `communication_id UUID` kolom die 1-op-1 naar `communications.id` wijst.
3. Is voor elke bestaande meeting + email een `communications` row aangemaakt via een idempotente backfill (via `supabase/seed/` of migration-time script).
4. Schrijven INSERT/UPDATE triggers op `meetings` en `emails` de gedeelde velden synchroon door naar `communications` — zodat oude code onveranderd blijft werken maar communications altijd actueel is.
5. Is er één `PARTY_TYPES` enum in `packages/ai/src/validations/communication.ts` die de unie van beide huidige enums bevat (`internal, client, partner, accountant, tax_advisor, lawyer, advisor, other`). **`supplier` hoort NIET in deze lijst** — die bestaat alleen in `organizations.type`, niet in party_type enums op meetings/emails.
6. Bevestigt een contract-test in CI dat de CHECK constraint op `communications.party_type` exact matcht met de TS enum.
7. Werkt het systeem functioneel identiek aan voor deze sprint — géén gedragsverandering zichtbaar voor gebruikers.

**Verschil tussen meetings.date (NULLABLE) en emails.date (NOT NULL):** `communications.occurred_at` wordt **NULLABLE** zodat historische meetings zonder datum ook mee kunnen. Nieuwe rijen krijgen altijd een waarde via de dual-write trigger.

**verification_status timing noot:** `meetings.verification_status` + `verified_by` + `verified_at` zijn niet in de base-tabel — toegevoegd via `20260331000001_verification_status.sql`. Backfill moet daar rekening mee houden: beide kolommen bestaan nu, dus geen speciale logic nodig, maar de backfill-query moet `COALESCE(verification_status, 'draft')` gebruiken voor veiligheid.

**Expliciet niet in scope:**

- Queries of mutations wijzigen (gebeurt in COMM-002)
- Gatekeeper / email-classifier refactor (gebeurt in COMM-002)
- RLS policies verplaatsen (gebeurt in COMM-002)
- Extractions-koppeling aanpassen (gebeurt in COMM-002)
- UI wijzigingen (gebeurt in COMM-003)
- Oude kolommen droppen (gebeurt in COMM-003)

## Requirements

| ID       | Beschrijving                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DATA-070 | Tabel `communications` met kolommen: `id UUID PK`, `channel TEXT CHECK IN ('meeting','email')`, `occurred_at TIMESTAMPTZ NULLABLE` (meetings.date is nullable, emails.date NOT NULL; communications kiest nullable voor historische data), `party_type TEXT`, `organization_id UUID FK organizations(id) ON DELETE SET NULL`, `unmatched_organization_name TEXT`, `scope TEXT CHECK IN ('project','relationship','internal','admin','other')` (**nieuw concept — niet gedeeld van meetings/emails**), `relevance_score FLOAT`, `verification_status TEXT default 'draft' CHECK IN ('draft','verified','rejected')`, `verified_by UUID FK profiles(id)`, `verified_at TIMESTAMPTZ`, `embedding VECTOR(1024)`, `embedding_stale BOOLEAN DEFAULT TRUE`, `search_vector TSVECTOR`, `created_at`, `updated_at`. |
| DATA-071 | `meetings.communication_id UUID UNIQUE REFERENCES communications(id) ON DELETE CASCADE` toegevoegd, nullable tijdens transitie.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| DATA-072 | `emails.communication_id UUID UNIQUE REFERENCES communications(id) ON DELETE CASCADE` toegevoegd, nullable tijdens transitie.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| DATA-073 | CHECK constraint op `communications.party_type` accepteert alleen waardes uit de gedeelde enum `(internal, client, partner, accountant, tax_advisor, lawyer, advisor, other)` — **8 waardes, géén `supplier`** (supplier hoort tot `organizations.type`, niet tot party_type). CHECK op `meetings.party_type` (huidig: 4 waardes) en `emails.party_type` (huidig: 7 waardes) worden in déze sprint verbreed naar dezelfde 8-waarden unie.                                                                                                                                                                                                                                                                                                                                                                  |
| DATA-074 | Idempotent backfill-script `supabase/seed/backfill-communications.sql` (of runnable migration) creëert per bestaande meeting/email een `communications` rij en vult `communication_id` terug.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| DATA-075 | Trigger `meetings_sync_communication` (AFTER INSERT OR UPDATE) schrijft gedeelde velden door naar `communications`. `channel = 'meeting'`, `occurred_at = meetings.date`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| DATA-076 | Trigger `emails_sync_communication` (AFTER INSERT OR UPDATE) schrijft gedeelde velden door naar `communications`. `channel = 'email'`, `occurred_at = emails.date`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| DATA-077 | Index `idx_communications_occurred_at DESC`, `idx_communications_party_type`, `idx_communications_organization_id`, HNSW op `embedding`, GIN op `search_vector`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| DATA-078 | RLS enabled op `communications` met identieke policies als huidige `meetings` + `emails` (permissive voor authenticated). Geen fine-grained portal policies in deze sprint — die komen in COMM-002.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| FUNC-070 | Shared constants/enum bestand `packages/ai/src/validations/communication.ts` exporteert `PARTY_TYPES`, `COMMUNICATION_CHANNELS`, `COMMUNICATION_SCOPES`, `VERIFICATION_STATUSES` als `as const` tuples.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| FUNC-071 | Contract-test in `packages/database/src/__tests__/communications-enum-drift.test.ts` leest via Supabase de CHECK-constraint definitie en asserteert dat de set exact matcht met `PARTY_TYPES`. Test gebruikt `describeWithDb`. Draait in CI.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| RULE-070 | Geen code in deze sprint leest van of schrijft naar `communications` direct — alleen via triggers. Dit houdt de blast radius nul.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

## Taken

### Taak 1: Shared validation module

- [ ] Nieuw: `packages/ai/src/validations/communication.ts`
  - `export const PARTY_TYPES = ['internal', 'client', 'partner', 'accountant', 'tax_advisor', 'lawyer', 'advisor', 'other'] as const` — **8 waardes, géén `supplier`**
  - `export type PartyType = (typeof PARTY_TYPES)[number]`
  - `export const COMMUNICATION_CHANNELS = ['meeting', 'email'] as const`
  - `export const COMMUNICATION_SCOPES = ['project', 'relationship', 'internal', 'admin', 'other'] as const`
  - `export const VERIFICATION_STATUSES = ['draft', 'verified', 'rejected'] as const`
  - Zod schemas: `PartyTypeSchema = z.enum(PARTY_TYPES)` etc.

**Geraakt:** nieuwe file.

### Taak 2: Migratie — communications tabel

- [ ] `supabase/migrations/YYYYMMDD_comm001_create_communications.sql`
  - `CREATE TABLE communications (...)` met alle kolommen uit DATA-070
  - Indexes uit DATA-077
  - RLS enable + permissive policies (DATA-078)
  - Trigger `communications_search_vector_update()` identiek aan meetings/emails patroon (wordt in COMM-003 de enige; nu nog slapend tot dual-write 'm vult)
  - `communications.updated_at` trigger

**Geraakt:** nieuwe migratie.

### Taak 3: Migratie — party_type enum verbreden op meetings + emails

- [ ] `supabase/migrations/YYYYMMDD_comm001_align_party_type.sql`
  - Drop + recreate `meetings_party_type_check` met nieuwe unie-enum (was: `client, partner, internal, other`)
  - Drop + recreate `emails_party_type_check` met nieuwe unie-enum (was: `internal, client, accountant, tax_advisor, lawyer, partner, other`)
  - Beide eindigen op exact dezelfde set als `communications.party_type`
  - Géén dataverandering — alleen constraint verbreden

**Geraakt:** nieuwe migratie.

### Taak 4: Migratie — communication_id FK op meetings + emails

- [ ] `supabase/migrations/YYYYMMDD_comm001_add_communication_id.sql`
  - `ALTER TABLE meetings ADD COLUMN communication_id UUID UNIQUE REFERENCES communications(id) ON DELETE CASCADE`
  - `ALTER TABLE emails ADD COLUMN communication_id UUID UNIQUE REFERENCES communications(id) ON DELETE CASCADE`
  - Index op beide

**Geraakt:** nieuwe migratie.

### Taak 5: Backfill script

- [ ] `supabase/migrations/YYYYMMDD_comm001_backfill_communications.sql`
  - Voor elke `meetings` zonder `communication_id`: INSERT in `communications` met alle gedeelde velden, UPDATE `meetings.communication_id`
  - Idem voor `emails`
  - Idempotent: `WHERE communication_id IS NULL` guard
  - Log count: `RAISE NOTICE 'backfilled % communications'`
  - `occurred_at`: `meetings.date` kan NULL zijn → `communications.occurred_at` mag NULL blijven. `emails.date` is altijd gevuld.
  - `verification_status`: `COALESCE(meetings.verification_status, 'draft')` — defensief omdat de kolom via `20260331000001_verification_status.sql` later is toegevoegd
  - party_type: voor meetings met `party_type IS NULL` en emails zonder party_type blijft NULL; geen gokken
  - scope: default `'project'` als er een project-koppeling bestaat via `meeting_projects`/`email_projects`, anders `NULL` (Gatekeeper/email-classifier vult 'm in COMM-002). Scope is een **nieuw concept** — bestaat niet in meetings/emails, dus niks te backfillen vanuit oude kolommen.

**Geraakt:** nieuwe migratie.

### Taak 6: Dual-write triggers

- [ ] `supabase/migrations/YYYYMMDD_comm001_dual_write_triggers.sql`
  - `meetings_sync_communication()` — AFTER INSERT OR UPDATE. Als `communication_id IS NULL` → INSERT in communications + UPDATE terug. Als niet NULL → UPDATE `communications` SET gedeelde velden. Bewaakt kanaal = 'meeting', occurred_at = meetings.date.
  - `emails_sync_communication()` — idem voor emails (kanaal = 'email', occurred_at = emails.date).
  - Beide triggers schrijven ook `embedding`, `embedding_stale`, `search_vector` door zodat COMM-002 queries direct kan gebruiken.

**Geraakt:** nieuwe migratie.

### Taak 7: Types regenereren

- [ ] `npm run db:types` of equivalent — update `packages/database/src/types/database.ts` met nieuwe `communications` tabel + `communication_id` kolommen.

**Geraakt:** `packages/database/src/types/database.ts`.

### Taak 8: Contract-test voor enum drift

- [ ] Nieuw: `packages/database/src/__tests__/communications-enum-drift.test.ts`
  - `describeWithDb('communications enum drift', ...)` (patroon uit bestaande DB-tests)
  - Query `information_schema.check_constraints` voor `communications_party_type_check`, `meetings_party_type_check`, `emails_party_type_check`
  - Parse de enum-waardes eruit
  - Assert dat alle drie sets **exact** matchen met `PARTY_TYPES` uit `communication.ts`
  - Faalt bij drift → rode build

**Geraakt:** nieuwe test file.

### Taak 9: Manuele backfill-verificatie

- [ ] Script `scripts/verify-communications-backfill.ts` dat admin client gebruikt om te checken:
  - `count(meetings) == count(meetings WHERE communication_id IS NOT NULL)`
  - `count(emails) == count(emails WHERE communication_id IS NOT NULL)`
  - Alle `communications` hebben correct `channel` + `occurred_at`
  - Spot-check: random 10 rows per kanaal, gedeelde velden zijn identiek in beide tabellen
- [ ] Rapport printen; exit code 1 bij mismatch

**Geraakt:** nieuwe script.

## Acceptatiecriteria

- [ ] Alle migraties draaien schoon op een verse én op huidige productie-snapshot (lokaal getest via `supabase db reset` + productie-dump).
- [ ] Alle bestaande tests blijven groen (geen regressie).
- [ ] Nieuwe contract-test slaagt; faalt bij gesimuleerde drift (bv. waarde toegevoegd aan TS enum maar niet aan CHECK).
- [ ] Verify-script toont 100% backfill coverage en geen veld-mismatches.
- [ ] `npm run type-check` slaagt.
- [ ] Handmatige rooktest in dev: nieuwe meeting via Fireflies-pipeline → `communications` row verschijnt + gedeelde velden matchen. Nieuwe email idem.
- [ ] UPDATE op meeting/email (bv. review approval) → communications row volgt mee.
- [ ] Geen enkele query of component in apps/ hoeft aangepast — zero gedragsverandering.

## Risico's

- **Trigger recursie** — communications heeft geen reverse trigger naar meetings/emails, dus geen risico. Maar check expliciet in tests.
- **Search-vector drift** — meetings + emails hebben eigen trigger die `search_vector` vult op basis van kanaal-specifieke velden (title/subject). In COMM-001 kopieert de dual-write trigger die vector één-op-één door. COMM-003 consolideert.
- **Backfill-volume** — bij grote tabellen kan de backfill tabelvergrendelingen veroorzaken. Draai in batches van 1000 met `pg_sleep` indien nodig.
- **Enum-verbreding op bestaande CHECK** — oude rows kunnen nooit violerende waarden hebben, dus veilig.

## Bronverwijzingen

- `supabase/migrations/20260329000005_meetings.sql` (meetings schema)
- `supabase/migrations/20260408000002_emails.sql` (emails schema)
- `supabase/migrations/20260408000009_email_type_party_type.sql` (emails party_type enum)
- `supabase/migrations/20260414100000_administratie_relationship_types.sql` (advisor/internal types)
- `packages/ai/src/validations/gatekeeper.ts` (huidige MEETING_TYPES + PARTY_TYPES constants)
- `docs/dependency-graph.md` (impact van meetings/emails queries)
- `docs/specs/vision-ai-native-architecture.md` (communications als cross-quadrant fundament)

## Vervolg

- **COMM-002**: queries/mutations lezen van `communications`, shared `classifyCounterparty()`, gatekeeper + email-classifier refactor, RLS policies verplaatsen naar communications, extractions.communication_id.
- **COMM-003**: UI consolideren, `meetings`/`emails` gedeelde kolommen als `GENERATED ALWAYS` of droppen, triggers opruimen, review-flow unified.

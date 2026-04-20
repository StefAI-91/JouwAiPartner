# Sprint COMM-003: UI consolideren + oude kolommen deprecaten

> **Scope-afbakening.** Derde en laatste sprint van de communications-refactor. Bouwt op COMM-001 (supertype + dual-write) en COMM-002 (queries + RLS + classifier). In deze sprint wordt `communications` de enige bron van waarheid voor gedeelde velden: UI leest eruit, dual-write triggers verdwijnen, en gedeelde kolommen op `meetings`/`emails` worden `GENERATED ALWAYS AS` kopieën óf gedropt. Review queue wordt kanaaloverstijgend.

## Doel

Na deze sprint:

1. Toont `/review` één unified queue met meetings + emails door elkaar, gesorteerd op `occurred_at`, filterbaar op kanaal + party_type + scope.
2. Leest de meeting-carrousel op `/` en de AI-pulse strip van `communications` (via COMM-002 queries).
3. Gebruikt `/meetings/[id]` en `/emails/[id]` nog steeds kanaal-specifieke views (transcript vs body), maar laden gedeelde velden via `getCommunicationById()`.
4. Zijn gedeelde kolommen op `meetings` + `emails` gedeprecatied: óf omgezet naar `GENERATED ALWAYS AS (...)` die leest uit communications (read-only kopie voor backward-compat), óf volledig gedropt als geen externe code ze nog schrijft.
5. Zijn dual-write triggers uit COMM-001 verwijderd (richting is nu eenduidig: communications is primary, channel-tabellen houden alleen kanaal-specifieke data).
6. Hebben mutations één pad: schrijven naar `communications` + meetings/emails voor kanaal-eigen velden. Geen verborgen triggers meer.
7. Is de backlog-README gemarkeerd: communications-refactor done, drift onmogelijk gemaakt.

**Expliciet niet in scope:**

- MCP-tools refactor (kanaal-specifieke tools blijven — aparte sprint)
- Nieuwe UI-features bovenop communications (relationship-detailpagina, organization-hub, etc. — aparte sprints)
- Portal communication-views (aparte sprint na portal-GA)
- Performance-optimalisatie (views/materialized views) — alleen als meetbaar probleem

## Requirements

| ID       | Beschrijving                                                                                                                                                                                                                                                    |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FUNC-090 | `/review` gebruikt `listDraftCommunications({ limit, offset })` en toont unified queue. Filters: kanaal (meeting/email/all), party_type, scope.                                                                                                                 |
| FUNC-091 | `/meetings`, `/meetings/[id]`, `/emails`, `/emails/[id]` routes blijven bestaan en laten kanaal-specifieke data zien, maar gedeelde velden (party_type, verification_status, organization) komen uit `communications`.                                          |
| FUNC-092 | AI-pulse + dashboard-carrousel gebruiken `communications` queries uit COMM-002.                                                                                                                                                                                 |
| DATA-090 | Kolommen die in COMM-001 in beide tabellen staan én nu uit communications komen, worden **één** van twee dingen (keuze per kolom): (a) `ALTER COLUMN ... GENERATED ALWAYS AS` met subquery naar communications, (b) `DROP COLUMN`. Besluit per kolom in Taak 1. |
| DATA-091 | Dual-write triggers `meetings_sync_communication` + `emails_sync_communication` worden gedropt. Vervangen door mutation-level writes.                                                                                                                           |
| DATA-092 | Zoek-index (`search_vector`, HNSW embedding) op `meetings`/`emails` wordt gedeprecatieerd ten gunste van `communications.search_vector` + `communications.embedding`. Search queries wijzen naar communications.                                                |
| RULE-090 | Eén "last-drift-check" contract-test: assert dat er geen writes naar gedeelde velden in `meetings`/`emails` zijn anders dan via de shared mutation. Gedaan via grep-test op `mutations/*.ts` of via trigger-audit.                                              |
| UI-250   | Unified review queue pagina met kanaal-switcher, sortering, batch-goedkeuren per party_type.                                                                                                                                                                    |
| UI-251   | Meeting detail + email detail tonen `communications.verification_status` als bron (niet meer uit eigen kolom).                                                                                                                                                  |
| UI-252   | Party-type badge op meeting/email cards gebruikt gedeelde component `<PartyTypeBadge type="accountant">` uit `@repo/ui`.                                                                                                                                        |

## Taken

### Taak 1: Besluit per gedeelde kolom — GENERATED, DROP, of blijven?

Per kolom uit COMM-001 gedeelde lijst:

| Kolom                               | Besluit                           | Reden                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `party_type`                        | DROP uit meetings + emails        | Consumers zijn in COMM-002 al gemigreerd naar communications.                                                                                                                                                                                                                                                                    |
| `organization_id`                   | DROP uit meetings + emails        | Idem.                                                                                                                                                                                                                                                                                                                            |
| `unmatched_organization_name`       | DROP uit meetings + emails        | Idem.                                                                                                                                                                                                                                                                                                                            |
| `relevance_score`                   | DROP uit meetings + emails        | Idem.                                                                                                                                                                                                                                                                                                                            |
| `verification_status`               | DROP uit meetings + emails        | Review flow gaat volledig via communications.                                                                                                                                                                                                                                                                                    |
| `verified_by` / `verified_at`       | DROP uit meetings + emails        | Idem.                                                                                                                                                                                                                                                                                                                            |
| `embedding` / `embedding_stale`     | DROP uit meetings + emails        | HNSW op communications is genoeg; re-embed pipeline moet 1x migreren.                                                                                                                                                                                                                                                            |
| `search_vector`                     | DROP uit meetings + emails        | GIN op communications.search_vector is genoeg.                                                                                                                                                                                                                                                                                   |
| `date` (meetings) / `date` (emails) | **BLIJFT** als `occurred_at` bron | `communications.occurred_at` wordt `GENERATED ALWAYS AS (meetings.date)` of communications blijft source-of-truth en meetings.date wordt GENERATED. **Keuze: communications is source, meetings.date wordt GENERATED ALWAYS AS (SELECT occurred_at FROM communications WHERE id = meetings.communication_id)**. Backward-compat. |
| `created_at` / `updated_at`         | BLIJFT op beide                   | Technische audit-velden; communications heeft eigen.                                                                                                                                                                                                                                                                             |

**Risico:** Postgres `GENERATED ALWAYS AS` kent geen subquery. Alternatief: gewoon DROPpen en alle code lezen via `JOIN communications`. Beslis dit in Taak 1 uitwerking — waarschijnlijk DROP + JOIN is schoner.

- [ ] Definitief besluit documenteren in deze sprint file met motivering
- [ ] Migratie opbouwen volgens besluit

**Geraakt:** nieuwe migratie(s).

### Taak 2: Query/mutation audit — zeker weten dat niets meer schrijft naar te-droppen kolommen

- [ ] Grep door `packages/database/src/mutations/` + `packages/ai/src/pipeline/` + `apps/*/src/actions/` op elke te-droppen kolom (`meetings.party_type`, `emails.verification_status`, etc.)
- [ ] Fix elke resterende write — moet via shared mutation uit COMM-002
- [ ] Fix elke lees-call die nog op oude kolom zit — route via communications query

**Geraakt:** diverse files, afhankelijk van findings.

### Taak 3: Dual-write triggers droppen

- [ ] Migratie `YYYYMMDD_comm003_drop_dual_write_triggers.sql`
  - `DROP TRIGGER meetings_sync_communication ON meetings`
  - `DROP TRIGGER emails_sync_communication ON emails`
  - `DROP FUNCTION meetings_sync_communication()`
  - `DROP FUNCTION emails_sync_communication()`
- [ ] Verificatie: na drop, nieuwe meeting via pipeline schrijft via `insertMeeting()` → `insertCommunication()` → rest volgt

**Geraakt:** nieuwe migratie, `mutations/meetings.ts`, `mutations/emails.ts`.

### Taak 4: Drop gedeelde kolommen (migratie)

- [ ] Migratie `YYYYMMDD_comm003_drop_shared_columns.sql`
  - `ALTER TABLE meetings DROP COLUMN party_type, DROP COLUMN organization_id, DROP COLUMN unmatched_organization_name, DROP COLUMN relevance_score, DROP COLUMN verification_status, DROP COLUMN verified_by, DROP COLUMN verified_at, DROP COLUMN embedding, DROP COLUMN embedding_stale, DROP COLUMN search_vector, DROP COLUMN date`
  - Idem voor emails
  - Drop bijbehorende indexes + constraints
  - Drop `meetings_party_type_check`, `emails_party_type_check`, `meetings_verification_*` etc.
  - Drop search_vector trigger + functie op meetings/emails
- [ ] Types regenereren

**Geraakt:** nieuwe migratie, `packages/database/src/types/database.ts`.

### Taak 5: Queries/mutations opschonen

- [ ] `packages/database/src/queries/meetings.ts` — alle functies die op gedeelde velden filterden gaan nu via `queries/communications.ts`. `queries/meetings.ts` retourneert enkel kanaal-specifieke data (transcript, participants[], fireflies_id, raw_fireflies) + JOIN op communications voor shared.
- [ ] Idem voor `queries/emails.ts` (body_text, body_html, gmail_id, thread_id, etc.)
- [ ] Alle queries retourneren één samengevoegde shape (bv. `MeetingWithCommunication`) via Supabase select relation-syntax
- [ ] Tests updaten

**Geraakt:** `queries/meetings.ts`, `queries/emails.ts`, `mutations/meetings.ts`, `mutations/emails.ts`, tests.

### Taak 6: Unified review UI

- [ ] `apps/cockpit/src/app/(dashboard)/review/page.tsx`
  - Kanaal-switcher (tabs of filter: "Alles / Meetings / Emails")
  - Lijst gesorteerd op `occurred_at` DESC met kanaal-badge + party_type-badge
  - Batch-actie: "Goedkeur alle van party_type = accountant" (optioneel, nice-to-have)
- [ ] Behoud `/review/[id]` + `/review/email/[id]` voor detail-review
- [ ] Empty state + loading
- [ ] Bestaande reviewer-tests groen houden

**Geraakt:** `review/page.tsx`, review-componenten.

### Taak 7: Gedeelde party-type badge component

- [ ] `packages/ui/src/party-type-badge.tsx` (Client Component)
  - Props: `type: PartyType`, `size?: 'sm' | 'md'`
  - Kleur + label mapping (groen=internal, blauw=client, paars=partner, oranje=advisor-varianten, grijs=other)
  - Import `PartyType` uit `@repo/ai/validations/communication`
- [ ] Vervang inline badges in review-, meeting-, email-lijsten door deze component

**Geraakt:** `packages/ui/src/party-type-badge.tsx`, alle call-sites.

### Taak 8: Search consolidatie

- [ ] `queries/search.ts` (of equivalent): full-text + semantic search gaat nu via `communications.search_vector` + `communications.embedding`
- [ ] MCP search-tool blijft draaien — check dat het resultaat shape niet breekt (kan nog kanaal-specifieke velden mee-hydrateren via JOIN)
- [ ] Re-embed cron/pipeline: werkt nu op communications-rows, niet meer op meetings/emails aparte

**Geraakt:** search queries, MCP search tool, re-embed script.

### Taak 9: Drift-preventie contract test

- [ ] `packages/database/src/__tests__/communications-drift-prevention.test.ts`
  - Query `information_schema.columns` voor meetings + emails
  - Assert dat geen van de 14 gedeelde kolomnamen meer bestaat op meetings of emails
  - Assert dat er geen trigger meer is op meetings/emails met naam `%sync_communication%`
- [ ] Draait in CI

**Geraakt:** nieuwe test.

## Acceptatiecriteria

- [ ] Review queue toont meetings + emails door elkaar, filterbaar
- [ ] Goedkeuren van een meeting/email via nieuwe UI werkt end-to-end
- [ ] `/meetings/[id]` + `/emails/[id]` tonen correcte party_type en organization uit communications
- [ ] Search (full-text + semantic) werkt via communications; resultaten consistent met voor de refactor
- [ ] Geen regressie in MCP-tools (bestaande integration tests groen)
- [ ] Portal RLS-test uit COMM-002 blijft groen
- [ ] Drift-preventie-test slaagt en faalt bij gesimuleerde "oude kolom herintroductie"
- [ ] `npm run build`, `type-check`, `test` slagen
- [ ] Handmatige rooktest dev-omgeving: maak nieuwe meeting → verschijnt in review queue → goedkeuren → verschijnt in dashboard → zoekbaar. Zelfde voor email.
- [ ] Sprint backlog README gemarkeerd: "Communications supertype: done"

## Risico's

- **Kolom DROP is onomkeerbaar** — rollback vereist backup restore. Mitigatie: draai eerst in staging, behoud Supabase backup 30 dagen na deploy, fase: eerst `ALTER COLUMN ... DROP NOT NULL` + rename naar `_deprecated_*` voor 1 sprint, dán pas DROPpen. Of: accepteer risico en draai in één migratie met expliciet team go/no-go.
- **Re-embed pipeline breekt** — oude pipeline leest van `meetings.embedding`, nieuwe moet `communications.embedding`. Mitigatie: re-embed script in Taak 8 vóór DROP-migratie.
- **MCP downstream consumers** — clients die MCP gebruiken kunnen op oude response-shape bouwen. Mitigatie: behoud huidige shape via JOIN; breaking MCP changes in aparte sprint.
- **Search-index rebuild tijd** — HNSW op communications is al in COMM-001 aangemaakt en via dual-write gevuld. Na DROP op meetings: geen rebuild nodig.
- **Unified review UI-regressie** — behoud oude `/review` als feature flag fallback eerste week in productie.

## Bronverwijzingen

- Sprint COMM-001: `sprints/backlog/sprint-COMM-001-supertype-dual-write.md`
- Sprint COMM-002: `sprints/backlog/sprint-COMM-002-queries-pipeline-rls.md`
- Huidige review route: `apps/cockpit/src/app/(dashboard)/review/`
- Huidige meetings detail: `apps/cockpit/src/app/(dashboard)/meetings/[id]/`
- Huidige emails detail: `apps/cockpit/src/app/(dashboard)/emails/[id]/`
- Shared UI package: `packages/ui/`
- MCP search tool: `packages/mcp/src/tools/`

## Afronding

Na deze sprint:

- Communications is **de** bron van waarheid voor party_type, organization, verification en scope
- Meetings + emails houden alleen kanaal-specifieke data
- Drift tussen kanalen is structureel onmogelijk
- Toekomstige kanalen (Slack, Rinkel, support-chat) kunnen met minimale moeite aansluiten

**Backlog-update:** verplaats alle drie COMM-sprints naar `sprints/done/`, update `sprints/backlog/README.md`.

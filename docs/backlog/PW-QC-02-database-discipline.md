# Micro Sprint PW-QC-02: Database discipline (queries, idempotency, migraties)

> **Parent tranche:** [`PW-QC-index.md`](./PW-QC-index.md) — quality-check follow-up op PW-02.

## Doel

De DB-interacties die in PW-02 ad-hoc zijn gebouwd (direct `db.from(...)` in Server Actions, dubbele `extractions`-inserts bij re-runs, misleidende UNIQUE-constraint) in lijn brengen met Flowwijs. Voorkomt datalekken in de UI en inconsistenties zodra de feature-flag permanent aan staat.

## Requirements

| ID          | Beschrijving                                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| DATA-QC-001 | Nieuwe functie `packages/database/src/queries/extractions.ts`: `getExtractionsForMeetingByType(meetingId, type)`              |
| DATA-QC-002 | `packages/database/src/queries/meetings.ts`: bestaande `getMeetingById`/`listMeetings` hergebruiken in dev-extractor action   |
| DATA-QC-003 | Page `dev/extractor/page.tsx`: stop met `select("id, title, date, transcript, transcript_elevenlabs")` op 40 rows             |
| DATA-QC-004 | Page filtert op DB: `.or("transcript.not.is.null,transcript_elevenlabs.not.is.null")` + select alleen `id, title, date, type` |
| DATA-QC-005 | Transcript-fetch verschuift naar de action (al per-meeting) — payload page-load ≥90% kleiner                                  |
| DATA-QC-006 | `experimental_risk_extractions` UNIQUE-constraint ondubbelzinnig maken: óf `(meeting_id, prompt_version)` + upsert, óf weg    |
| DATA-QC-007 | Mutation `packages/database/src/mutations/experimental-risk-extractions.ts` aangepast aan de gekozen semantiek                |
| DATA-QC-008 | `saveStructuredExtractions` idempotent: DELETE voor meeting_id vóór insert, in één transactie of via RPC                      |
| DATA-QC-009 | Migratie `20260418130000_extractions_14_types.sql` verrijkt met pre-check op onbekende types (assertion of defensive drop)    |
| QUAL-QC-010 | Test: re-run van pipeline op dezelfde meeting geeft exact 1 set extractions, niet dubbel                                      |
| QUAL-QC-011 | Test: `getExtractionsForMeetingByType` geeft alleen risks terug (geen leakage van andere types)                               |
| QUAL-QC-012 | Spot-check: productie-query voor `/dev/extractor` page trekt <20 KB per row (was 40-100 KB)                                   |
| RULE-QC-010 | Geen `select("*")` introduceren; lees alleen wat nodig is                                                                     |
| RULE-QC-011 | Actions gebruiken query-functies, niet direct `db.from(...)`                                                                  |
| EDGE-QC-010 | Migratie faalt niet silent bij bestaande rijen met onverwacht type (fail-fast met duidelijke error)                           |
| EDGE-QC-011 | `saveStructuredExtractions` is atomair: bij crash midden in DELETE+INSERT blijft DB consistent                                |

## Bronverwijzingen

- Review-findings **D1** (centraliseer queries), **D2** (transcript-payload), **D3** (UNIQUE klopt niet), **D4** (niet-idempotent), **D5** (migratie defensief).
- Flowwijs-regel `CLAUDE.md` → "Centraliseer queries in `packages/database/src/queries/`. Eén plek per domein."
- Flowwijs-regel `CLAUDE.md` → "Filter op de database. Niet ophalen en dan in JS filteren."
- Flowwijs-regel `CLAUDE.md` → "Seed data is idempotent. Altijd `ON CONFLICT DO UPDATE`."
- Bestaande queries: `packages/database/src/queries/meetings.ts`, `packages/database/src/queries/review.ts`.

## Context

### Huidige pijnpunten

**D1 — ad-hoc queries in Server Action**

```ts
// apps/cockpit/src/actions/dev-extractor.ts:86-91
const { data: extractions } = await db
  .from("extractions")
  .select("id, type, content, source_quote, confidence, metadata")
  .eq("meeting_id", meetingId)
  .eq("type", type);
```

**D2 — transcript-kolommen altijd geladen op lijst**

```ts
// apps/cockpit/src/app/(dashboard)/dev/extractor/page.tsx:20-25
const { data: meetings } = await db
  .from("meetings")
  .select("id, title, date, meeting_type, transcript, transcript_elevenlabs")
  .order("date", { ascending: false })
  .limit(40);
// Daarna filter: m.transcript || m.transcript_elevenlabs  ← alleen om lege meetings te droppen
```

**D3 — misleidende UNIQUE**

```sql
-- supabase/migrations/20260418150000_experimental_risk_extractions.sql:34
UNIQUE (meeting_id, prompt_version, created_at)  -- created_at default now() → altijd uniek
```

Comment boven zegt "één rij per (meeting, prompt_version)", maar de constraint dwingt dat niet af.

**D4 — re-run creëert duplicaten**
`saveStructuredExtractions` → `insertExtractions` zonder dedup. Reprocess van een meeting = dubbele rows in `extractions`.

**D5 — migratie kan silent falen**
`DROP CONSTRAINT extractions_type_check` + `ADD CONSTRAINT ... CHECK (type IN (…14…))`. Als er één legacy row is met type buiten de 14, faalt de migratie pas op dat moment zonder duidelijke melding welke rows.

### Keuzes

**D3 — twee opties, kies één:**

- **(a) Overschrijf-semantiek:** `UNIQUE(meeting_id, prompt_version)` + mutation doet `upsert({ onConflict: "meeting_id,prompt_version" })`. Elke re-run op dezelfde prompt-versie overschrijft. Data-verlies bij run-history, maar simpelere UI.
- **(b) Append-only:** constraint helemaal weg. Elke run = nieuwe row. Mutation doet alleen INSERT. Query "laatste run" doet `.order("created_at", { ascending: false }).limit(1)`.

Aanbevolen: **(b) append-only** — past beter bij het A/B-experimenteel karakter en geeft run-history voor latere analyse.

**D4 — twee opties:**

- **(a) DELETE + INSERT in één transactie** via Supabase RPC function (safest).
- **(b) UPSERT per row** via `(meeting_id, type, content_hash)` UNIQUE — complex want content-hash moet stable zijn.

Aanbevolen: **(a)** — expliciet, makkelijk te redeneren, matcht legacy gedrag.

## Werkwijze

1. **Query-laag** — maak `packages/database/src/queries/extractions.ts` met `getExtractionsForMeetingByType`. Vervang call in dev-extractor action.
2. **Page payload** — `page.tsx`: drop transcript-kolommen uit select, voeg `.or(...)` filter toe. Action krijgt transcript nu per-meeting via `getMeetingTranscript(meetingId)` (nieuwe query).
3. **UNIQUE fix** — beslis (a) of (b). Nieuwe migratie `20260420XXXXXX_experimental_risk_extractions_unique_fix.sql` die de constraint fixt. Mutation aanpassen.
4. **Idempotency** — nieuwe Supabase RPC of Postgres function `reset_extractions_for_meeting(meeting_id uuid)` die DELETE+INSERT wrapt. `saveStructuredExtractions` roept deze aan.
5. **Migratie-veiligheid** — patch `20260418130000_*.sql` is al gerund, dus: nieuwe migratie `20260420XXXXXX_extractions_type_check_defensive.sql` die logt wat er misging als er ooit legacy rows waren. Plus assertion-query als comment voor toekomstige migraties.
6. **Tests** — `packages/ai/__tests__/pipeline/save-structured-extractions.test.ts` uitbreiden met re-run test. Nieuwe `packages/database/__tests__/queries/extractions.test.ts`.

## Definition of done

- Migraties + type-check + tests groen.
- Handmatig: reprocess dezelfde meeting 2× in dev → count rows in `extractions` blijft gelijk.
- Page-load `/dev/extractor`: network payload <100 KB (was ~2-4 MB).
- RiskSpecialist re-run 3× → 3 rows in `experimental_risk_extractions` (append-only gekozen) of 1 row (upsert gekozen), conform keuze.

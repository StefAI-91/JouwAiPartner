# Micro Sprint 03: API Routes refactoren naar thin gateways

## Doel

Twee API route handlers bevatten business logic die in services thuishoort. CLAUDE.md schrijft voor: "api/ -- Route handlers (alleen voor webhooks/externe calls)". De route handler moet een thin gateway zijn: auth check, input validatie, service call, response. Deze sprint verplaatst de orchestratie-logica naar service-bestanden zodat de routes minimaal worden en de business logic testbaar en herbruikbaar is.

## Fixes

| # | Beschrijving |
|---|---|
| F6 | Fireflies ingest route: verplaats loop + status tracking naar service |
| F7 | Fireflies webhook route: verplaats processing naar service, houd alleen HMAC + delegatie |

## Context

### Fireflies ingest route (`src/app/api/ingest/fireflies/route.ts`, 156 regels)

Huidige structuur:
- Regels 1-8: imports
- Regels 10-24: Zod schema + IngestResult interface
- Regels 26-36: POST handler start (auth check, input parse)
- Regels 38-47: Early return bij geen transcripts
- **Regels 49-139: Business logic** -- for-loop over transcripts met:
  - Idempotency check (getMeetingByFirefliesId)
  - Full transcript fetch
  - Pre-filters (duration, participants)
  - Chunking + pipeline call
  - Error handling per item
  - Result aggregation
- Regels 141-156: Summary + embed + response

Wat in de route moet blijven (~30 regels):
```
POST handler:
  1. Auth check (CRON_SECRET header)
  2. Parse input (limit parameter)
  3. Call service: ingestFirefliesTranscripts(limit)
  4. Return JSON response
```

Wat naar `src/lib/services/fireflies-ingest.ts` gaat:
- `IngestResult` interface
- `ingestFirefliesTranscripts(limit: number)` functie met de volledige loop
- Importeert: listFirefliesTranscripts, fetchFirefliesTranscript, chunkTranscript, getMeetingByFirefliesId, isValidDuration, hasParticipants, processMeeting, runReEmbedWorker

### Fireflies webhook route (`src/app/api/webhooks/fireflies/route.ts`, 93 regels)

Huidige structuur:
- Regels 1-7: imports
- Regels 9-15: `verifyFirefliesSignature` functie (HMAC)
- Regels 17-24: POST handler start (signature verificatie)
- Regels 26-31: Payload parse + event type check
- **Regels 33-92: Business logic** -- idempotency check, fetch, pre-filters, chunking, pipeline call

Wat in de route moet blijven (~25 regels):
```
POST handler:
  1. HMAC signature verificatie
  2. Parse payload
  3. Event type check (only "Transcription completed")
  4. Call service: processFirefliesWebhook(meetingId)
  5. Return JSON response
```

Wat naar `src/lib/services/fireflies-webhook.ts` gaat (of uitbreiding van fireflies-ingest.ts):
- `processFirefliesWebhook(meetingId: string)` functie
- Idempotency check, fetch, pre-filters, chunking, pipeline call

Let op: de HMAC verificatie (`verifyFirefliesSignature`) blijft in de route handler want dit is auth/gateway logica.

### Bestaande service structuur

Er bestaan al services in `src/lib/services/`:
- `embed-pipeline.ts` -- embedding orchestratie
- `gatekeeper-pipeline.ts` -- meeting processing pipeline
- `save-extractions.ts` -- extraction opslag
- `entity-resolution.ts` -- entity matching
- `re-embed-worker.ts` -- re-embedding worker

De nieuwe service files volgen hetzelfde patroon: puur TypeScript functies, geen Next.js specifieke code.

## Prerequisites

- [ ] Sprint 01 moet afgerond zijn (de service functies roepen actions aan die in sprint 01 Zod validatie krijgen)

## Taken

- [ ] **Taak 1: Maak `src/lib/services/fireflies-ingest.ts`** -- Verplaats uit de ingest route:
  - `IngestResult` interface
  - De volledige for-loop logica (regels 49-139 van huidige route)
  - Summary berekening + re-embed call
  - Exporteer als `ingestFirefliesTranscripts(limit: number): Promise<{ summary: {...}, embeddings: {...} | null, results: IngestResult[] }>`

- [ ] **Taak 2: Maak ingest route thin** -- Herschrijf `src/app/api/ingest/fireflies/route.ts` tot ~30 regels:
  - Auth check (CRON_SECRET)
  - Parse limit met bestaand Zod schema
  - Call `ingestFirefliesTranscripts(limit)`
  - Return `NextResponse.json(result)`

- [ ] **Taak 3: Maak `src/lib/services/fireflies-webhook.ts`** -- Verplaats uit de webhook route:
  - Exporteer `processFirefliesWebhook(meetingId: string): Promise<{ skipped: boolean; reason?: string } | { success: boolean; meetingId: string; ... }>`
  - Bevat: idempotency check, transcript fetch, pre-filters, chunking, pipeline call

- [ ] **Taak 4: Maak webhook route thin** -- Herschrijf `src/app/api/webhooks/fireflies/route.ts` tot ~25 regels:
  - HMAC verificatie (verifyFirefliesSignature blijft in route)
  - Parse payload + event type check
  - Call `processFirefliesWebhook(meetingId)`
  - Return response

- [ ] **Taak 5: Verify** -- Run `npm run build` en `npm run lint`.

## Acceptatiecriteria

- [ ] [F6] `src/app/api/ingest/fireflies/route.ts` is minder dan 50 regels
- [ ] [F6] Alle business logic (loop, pre-filters, pipeline calls) staat in `src/lib/services/fireflies-ingest.ts`
- [ ] [F6] De ingest route doet alleen: auth check, input parse, service call, response
- [ ] [F7] `src/app/api/webhooks/fireflies/route.ts` is minder dan 40 regels
- [ ] [F7] HMAC verificatie blijft in de route handler (dit is gateway logica)
- [ ] [F7] Alle processing logica staat in `src/lib/services/fireflies-webhook.ts`
- [ ] Functionaliteit is ongewijzigd (zelfde input/output contract voor beide endpoints)
- [ ] `npm run build` slaagt zonder fouten
- [ ] `npm run lint` slaagt zonder fouten

## Geraakt door deze sprint

- `src/lib/services/fireflies-ingest.ts` (nieuw)
- `src/lib/services/fireflies-webhook.ts` (nieuw)
- `src/app/api/ingest/fireflies/route.ts` (herschreven)
- `src/app/api/webhooks/fireflies/route.ts` (herschreven)

## Complexiteit

**Laag** -- Puur verplaatsen van code naar service files. Geen logica-wijzigingen. De route handlers worden thin wrappers.

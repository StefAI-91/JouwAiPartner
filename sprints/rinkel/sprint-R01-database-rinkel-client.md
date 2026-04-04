# Sprint R01: Database & Rinkel Client

**Fase:** VoIP Pipeline
**Doel:** Database uitbreiden voor telefoongegevens, Rinkel API client bouwen, en webhook endpoint opzetten.

## Requirements

| ID        | Beschrijving                                                                              |
| --------- | ----------------------------------------------------------------------------------------- |
| VOIP-001  | Meetings tabel uitbreiden met `source`, `rinkel_call_id`, `call_direction`, `phone_from`, `phone_to` |
| VOIP-002  | People tabel uitbreiden met `phone` kolom (E.164 formaat)                                 |
| VOIP-003  | Supabase Storage bucket aanmaken voor call recordings                                      |
| VOIP-004  | Rinkel API client met `x-rinkel-api-key` authenticatie                                     |
| VOIP-005  | Webhook endpoint voor Rinkel "Call End" events                                             |
| VOIP-006  | Idempotency check op `rinkel_call_id`                                                      |

## Context

### Rinkel API

- **Docs:** https://developers.rinkel.com/
- **Auth:** `x-rinkel-api-key` header
- **Plan:** Expert (vereist voor webhooks)
- **Webhook event:** "Call End" — payload bevat `callRecordingUrl`, `cause`, `id`, `datetime`
- **Audio URL:** geldig voor 3 uur na generatie — audio moet direct gedownload worden

### Architectuurbeslissingen

1. **Audio opslag:** Supabase Storage — Rinkel URLs verlopen na 3 uur, we bewaren het origineel
2. **Minimale gespreksduur:** 1 minuut (korter = geen zinvolle content)
3. **Beide richtingen:** Zowel inkomend als uitgaand verwerken
4. **Eigen pipeline:** Rinkel's Call Insights niet gebruiken, eigen AI pipeline voor consistentie

### Database wijzigingen

```sql
-- Meetings tabel uitbreiden
ALTER TABLE meetings ADD COLUMN source TEXT NOT NULL DEFAULT 'fireflies';
  -- CHECK (source IN ('fireflies', 'rinkel', 'manual'))
ALTER TABLE meetings ADD COLUMN rinkel_call_id TEXT UNIQUE;
ALTER TABLE meetings ADD COLUMN call_direction TEXT;
  -- CHECK (call_direction IN ('incoming', 'outgoing'))
ALTER TABLE meetings ADD COLUMN phone_from TEXT;
ALTER TABLE meetings ADD COLUMN phone_to TEXT;

-- People tabel uitbreiden
ALTER TABLE people ADD COLUMN phone TEXT;
  -- E.164 formaat, bijv. +31612345678

-- Index voor phone lookups
CREATE INDEX idx_people_phone ON people (phone) WHERE phone IS NOT NULL;
```

### Rinkel webhook payload (Call End)

```json
{
  "id": "1c8b83a7c690084224ec3984515bc1a2",
  "datetime": "2023-06-14T13:56:24.969Z",
  "cause": "ANSWERED",
  "callRecordingUrl": "https://api.rinkel.com/call-recordings/xxx/stream",
  "from": "+31201234567",
  "to": "+31612345678",
  "answeredBy": "User Name",
  "userId": "abc123"
}
```

### Environment variables

```
RINKEL_API_KEY=           # Rinkel Expert plan API key
RINKEL_WEBHOOK_SECRET=    # Voor webhook verificatie (indien ondersteund)
```

## Prerequisites

- [x] Sprint 014: MCP Verification Filter (v2 compleet)
- [ ] Rinkel Expert plan actief met API key

## Taken

- [ ] Migratie: meetings tabel uitbreiden met source, rinkel_call_id, call_direction, phone_from, phone_to
- [ ] Migratie: people tabel uitbreiden met phone kolom
- [ ] Migratie: index op people.phone
- [ ] Migratie: Supabase Storage bucket `call-recordings` aanmaken (of via dashboard)
- [ ] Rinkel client: `packages/ai/src/rinkel.ts` — API client met auth, fetchCallRecording, parseWebhookPayload
- [ ] Zod schema: `packages/ai/src/validations/rinkel.ts` — webhook payload validatie
- [ ] Webhook route: `apps/cockpit/src/app/api/webhooks/rinkel/route.ts`
- [ ] Webhook: filter op `cause === "ANSWERED"` (skip unanswered, voicemail, etc.)
- [ ] Webhook: duration filter ≥ 1 minuut
- [ ] Webhook: idempotency check op rinkel_call_id
- [ ] Webhook: audio downloaden en opslaan in Supabase Storage
- [ ] Mutation: `insertCallRecording(callId, audioBuffer)` in `packages/database/src/mutations/recordings.ts`
- [ ] TypeScript types updaten na migratie

## Acceptatiecriteria

- [ ] [VOIP-001] Meetings tabel heeft source, rinkel_call_id, call_direction, phone_from, phone_to kolommen
- [ ] [VOIP-002] People tabel heeft phone kolom met index
- [ ] [VOIP-003] Supabase Storage bucket `call-recordings` bestaat
- [ ] [VOIP-004] Rinkel client kan audio ophalen met API key
- [ ] [VOIP-005] Webhook ontvangt Call End events, filtert correct, slaat audio op
- [ ] [VOIP-006] Duplicate rinkel_call_id wordt niet opnieuw verwerkt

## Geraakt door deze sprint

- `supabase/migrations/XXXXXX_rinkel_columns.sql` (nieuw — meetings + people extensies)
- `packages/ai/src/rinkel.ts` (nieuw — Rinkel API client)
- `packages/ai/src/validations/rinkel.ts` (nieuw — webhook Zod schema)
- `apps/cockpit/src/app/api/webhooks/rinkel/route.ts` (nieuw — webhook endpoint)
- `packages/database/src/mutations/recordings.ts` (nieuw — audio storage)

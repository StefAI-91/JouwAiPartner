# Sprint R04: Audio Storage & Playback Hardening

**Fase:** VoIP Pipeline
**Doel:** Robuuste audio-opslag in Supabase Storage met signed URLs, cleanup policies, en fallback-logica voor verlopen Rinkel URLs.

## Requirements

| ID        | Beschrijving                                                                              |
| --------- | ----------------------------------------------------------------------------------------- |
| VOIP-040  | Supabase Storage bucket configuratie: RLS, file size limits, MIME types                    |
| VOIP-041  | Signed URL generatie voor audio playback (tijdelijk, verlopen na X uur)                    |
| VOIP-042  | Storage cleanup: verwijder audio van rejected meetings (na X dagen)                        |
| VOIP-043  | Retry logica: als audio download van Rinkel faalt, markeer voor handmatige actie           |
| VOIP-044  | Storage path conventie: `call-recordings/{year}/{month}/{rinkel_call_id}.webm`             |
| VOIP-045  | Monitoring: log storage usage en failed downloads                                          |

## Context

### Waarom apart sprint?

Audio storage heeft subtiliteiten die los staan van de pipeline:
- Rinkel URLs verlopen na 3 uur — robuuste download in sprint R01 is de happy path
- Dit sprint dekt edge cases: netwerk failures, storage limits, cleanup
- Signed URLs voor veilige playback zonder publieke bucket

### Storage structuur

```
call-recordings/
  2026/
    04/
      abc123def456.webm
      xyz789ghi012.webm
    05/
      ...
```

### Signed URLs

```typescript
// Server Action of API route
const { data } = await supabase.storage
  .from('call-recordings')
  .createSignedUrl(path, 3600); // 1 uur geldig
```

### Cleanup policy

- Verified meetings: audio bewaren (onbeperkt)
- Rejected meetings: audio verwijderen na 30 dagen
- Draft meetings ouder dan 90 dagen: audio verwijderen + notificatie

## Prerequisites

- [ ] Sprint R01: Database & Rinkel Client (bucket bestaat)
- [ ] Sprint R03: UI Updates (audio player component)

## Taken

- [ ] Supabase Storage bucket policy: RLS (alleen authenticated), max file size (100MB), allowed MIME types
- [ ] Server Action: `getCallRecordingUrl(meetingId)` — signed URL generatie
- [ ] Storage path utility: genereer consistent pad op basis van datum + rinkel_call_id
- [ ] Retry logica in webhook: als Rinkel audio download faalt → markeer meeting als `audio_failed`
- [ ] Meetings tabel: `audio_storage_path` kolom toevoegen (pad in Supabase Storage)
- [ ] Cleanup cron/worker: verwijder audio van rejected meetings (>30 dagen)
- [ ] Logging: storage operaties loggen (upload success/failure, size, duration)

## Acceptatiecriteria

- [ ] [VOIP-040] Storage bucket heeft RLS, size limit, en MIME type restrictie
- [ ] [VOIP-041] Signed URLs werken voor audio playback, verlopen na 1 uur
- [ ] [VOIP-042] Audio van rejected meetings wordt opgeruimd na 30 dagen
- [ ] [VOIP-043] Failed audio downloads worden gemarkeerd, pipeline logt error maar crasht niet
- [ ] [VOIP-044] Audio bestanden volgen consistent pad-patroon
- [ ] [VOIP-045] Storage operaties worden gelogd

## Geraakt door deze sprint

- `supabase/migrations/XXXXXX_audio_storage_path.sql` (nieuw — audio_storage_path kolom)
- `packages/database/src/mutations/recordings.ts` (gewijzigd — retry logica, path utility)
- `apps/cockpit/src/actions/recordings.ts` (nieuw — getCallRecordingUrl server action)
- `packages/ai/src/pipeline/call-pipeline.ts` (gewijzigd — audio_failed marking)
- Supabase Storage bucket configuratie (dashboard of migratie)

# Sprint R03: UI Updates voor Calls

**Fase:** VoIP Pipeline
**Doel:** Dashboard en meetings pagina's updaten zodat telefoongesprekken visueel onderscheidbaar zijn van vergaderingen.

## Requirements

| ID       | Beschrijving                                                                |
| -------- | --------------------------------------------------------------------------- |
| VOIP-030 | Meetings lijst: telefoon-icoon voor calls, meeting-icoon voor vergaderingen |
| VOIP-031 | Meetings lijst: call direction badge (inkomend/uitgaand)                    |
| VOIP-032 | Meetings lijst: filter op source (alle/fireflies/rinkel)                    |
| VOIP-033 | Meeting detail: telefoonnummers tonen (from → to)                           |
| VOIP-034 | Meeting detail: audio player voor opgeslagen call recording                 |
| VOIP-035 | Review queue: bron-indicator (telefoon vs vergadering)                      |
| VOIP-036 | Dashboard carousel: calls opnemen in meeting carousel                       |
| VOIP-037 | People pagina: telefoonnummer tonen en bewerkbaar maken                     |

## Context

### Visueel onderscheid

- **Vergadering (Fireflies):** `Video` icoon (Lucide) — bestaand gedrag
- **Telefoongesprek (Rinkel):** `Phone` icoon (Lucide) — nieuw
- **Call direction:** `PhoneIncoming` / `PhoneOutgoing` icoon of badge

### Source filter

Meetings pagina krijgt een extra filter dropdown:

- Alle bronnen (default)
- Vergaderingen (Fireflies)
- Telefoongesprekken (Rinkel)

### Audio player

Simpele HTML5 audio player in meeting detail voor calls met audio in Supabase Storage:

- Play/pause
- Progress bar
- Duur weergave
- Geen custom player nodig, native `<audio>` element met Tailwind styling

### People pagina

- Phone kolom toevoegen aan tabel
- Inline edit voor telefoonnummer (consistent met bestaande inline edit pattern)
- E.164 formaat validatie in Zod schema

## Prerequisites

- [ ] Sprint R02: Call Processing Pipeline (calls in database)

## Taken

- [ ] Component: `SourceIcon` — toont Phone of Video icoon op basis van `meeting.source`
- [ ] Component: `CallDirectionBadge` — inkomend/uitgaand badge
- [ ] Meetings lijst: SourceIcon integreren naast meeting titel
- [ ] Meetings lijst: source filter dropdown toevoegen
- [ ] Meetings query uitbreiden: filter op source parameter
- [ ] Meeting detail: telefoonnummers (phone_from → phone_to) tonen in header
- [ ] Meeting detail: audio player component voor call recordings
- [ ] Meeting detail: audio URL ophalen uit Supabase Storage (signed URL)
- [ ] Review queue: SourceIcon toevoegen aan draft meetings lijst
- [ ] Dashboard carousel: calls opnemen (bestaande query werkt al, alleen icoon toevoegen)
- [ ] People pagina: phone kolom in tabel
- [ ] People pagina: inline edit voor telefoonnummer
- [ ] People Zod schema: phone veld toevoegen met E.164 validatie
- [ ] People Server Action: updatePerson uitbreiden met phone

## Acceptatiecriteria

- [ ] [VOIP-030] Calls tonen Phone icoon, meetings tonen Video icoon in lijst
- [ ] [VOIP-031] Inkomende calls tonen "Inkomend" badge, uitgaande "Uitgaand"
- [ ] [VOIP-032] Source filter werkt: kan filteren op alleen calls of alleen meetings
- [ ] [VOIP-033] Meeting detail voor calls toont telefoonnummers
- [ ] [VOIP-034] Audio player speelt call recording af vanuit Supabase Storage
- [ ] [VOIP-035] Review queue toont bron-indicator
- [ ] [VOIP-036] Dashboard carousel bevat calls met correct icoon
- [ ] [VOIP-037] People pagina toont en bewerkt telefoonnummers

## Geraakt door deze sprint

- `apps/cockpit/src/components/meetings/source-icon.tsx` (nieuw)
- `apps/cockpit/src/components/meetings/call-direction-badge.tsx` (nieuw)
- `apps/cockpit/src/components/meetings/audio-player.tsx` (nieuw)
- `apps/cockpit/src/components/meetings/meeting-list.tsx` (gewijzigd — icoon + filter)
- `apps/cockpit/src/app/(dashboard)/meetings/page.tsx` (gewijzigd — source filter)
- `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx` (gewijzigd — phone info + audio)
- `apps/cockpit/src/app/(dashboard)/review/page.tsx` (gewijzigd — source indicator)
- `apps/cockpit/src/app/(dashboard)/people/page.tsx` (gewijzigd — phone kolom)
- `packages/database/src/queries/meetings.ts` (gewijzigd — source filter parameter)
- `apps/cockpit/src/actions/entities.ts` (gewijzigd — phone in updatePerson)

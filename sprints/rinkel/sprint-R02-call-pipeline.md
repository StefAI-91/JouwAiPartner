# Sprint R02: Call Processing Pipeline

**Fase:** VoIP Pipeline
**Doel:** Volledige verwerkingspipeline voor telefoongesprekken: transcriptie, classificatie, extractie, en opname in review queue.

## Requirements

| ID        | Beschrijving                                                                              |
| --------- | ----------------------------------------------------------------------------------------- |
| VOIP-010  | ElevenLabs transcriptie van opgeslagen audio (hergebruik bestaande code)                   |
| VOIP-011  | Telefoon-naar-persoon resolutie (phone number → people tabel)                              |
| VOIP-012  | Participant classificatie op basis van telefoonnummer matching                              |
| VOIP-013  | Gatekeeper classificatie van telefoongesprekken (hergebruik bestaande agent)                |
| VOIP-014  | Organisatie resolutie op basis van gatekeeper output + telefoon lookup                      |
| VOIP-015  | Meeting record aanmaken met source='rinkel' en verification_status='draft'                 |
| VOIP-016  | Summarizer draaien op call transcript (hergebruik bestaande agent)                         |
| VOIP-017  | Extractor draaien op call transcript (hergebruik bestaande agent)                          |
| VOIP-018  | Entity resolution voor projectkoppeling op basis van gesprekscontent                       |
| VOIP-019  | Embeddings genereren voor meeting + extractions                                            |
| VOIP-020  | Verwerkte calls verschijnen in review queue als draft                                      |

## Context

### Pipeline flow (analoog aan gatekeeper-pipeline.ts)

```
processCall(rinkelData, audioStoragePath)
    │
    ├─ 1. Transcribe: ElevenLabs Scribe v2 (uit Supabase Storage)
    ├─ 2. resolvePersonByPhone(phone_from) + resolvePersonByPhone(phone_to)
    ├─ 3. classifyParticipants() — internal/external op basis van phone match
    ├─ 4. runGatekeeper(transcript, metadata) — meeting_type + relevance
    ├─ 5. resolveOrganization() — uit gatekeeper + phone lookup
    ├─ 6. insertMeeting(source='rinkel', rinkel_call_id, verification_status='draft')
    ├─ 7. linkParticipants() — via phone matching
    ├─ 8. runSummarizeStep() — AI briefing van transcript
    ├─ 9. runExtractStep() — decisions, action_items, needs, insights
    │     └─ saveExtractions() — entity resolution + project matching
    └─ 10. embedMeetingWithExtractions()
```

### Phone number resolutie

Nieuw concept — Fireflies pipeline matcht op email, calls op telefoonnummer:

```typescript
// Nieuw: packages/ai/src/pipeline/phone-resolver.ts
resolvePersonByPhone(phone: string): Promise<{
  matched: boolean;
  person_id?: string;
  person_name?: string;
  organization_id?: string;
  organization_name?: string;
  team?: 'internal' | 'external';
}>
```

Matching strategie:
1. Exacte match op `people.phone` (E.164 genormaliseerd)
2. Match op laatste 9 cijfers (voor +31 vs 06 variaties)
3. Geen match → `unknown` label, gatekeeper bepaalt context

### Gatekeeper aanpassingen

Geen modelwijziging nodig. De gatekeeper werkt op transcript tekst — ongeacht bron. Wel:
- Title genereren: "Telefoongesprek [from] → [to] op [datum]" (als er geen titel is)
- Participants als `[from_name, to_name]` of `[phone_from, phone_to]` als naam onbekend

### Hergebruik van bestaande code

| Bestaand bestand | Hergebruik | Aanpassing |
|---|---|---|
| `packages/ai/src/transcribe-elevenlabs.ts` | Direct | Accepteert al audio URL |
| `packages/ai/src/agents/gatekeeper.ts` | Direct | Geen wijziging nodig |
| `packages/ai/src/agents/summarizer.ts` | Direct | Geen wijziging nodig |
| `packages/ai/src/agents/extractor.ts` | Direct | Geen wijziging nodig |
| `packages/ai/src/pipeline/entity-resolution.ts` | Direct | Geen wijziging nodig |
| `packages/ai/src/pipeline/embed-pipeline.ts` | Direct | Geen wijziging nodig |
| `packages/ai/src/pipeline/save-extractions.ts` | Direct | Geen wijziging nodig |
| `packages/ai/src/pipeline/participant-classifier.ts` | Uitbreiden | Phone-based classificatie toevoegen |

## Prerequisites

- [ ] Sprint R01: Database & Rinkel Client (audio opgeslagen in Supabase Storage)

## Taken

- [ ] Phone resolver: `packages/ai/src/pipeline/phone-resolver.ts` — resolvePersonByPhone()
- [ ] Phone normalisatie utility: +31612345678 vs 0612345678 vs 06-12345678 → canonical E.164
- [ ] Participant classifier uitbreiden: phone-based naast email-based matching
- [ ] Call pipeline: `packages/ai/src/pipeline/call-pipeline.ts` — processCall() met alle 10 stappen
- [ ] Stap 1: Audio ophalen uit Supabase Storage → ElevenLabs transcriptie
- [ ] Stap 2-3: Phone resolution + participant classificatie
- [ ] Stap 4-5: Gatekeeper classificatie + organisatie resolutie
- [ ] Stap 6-7: Meeting insert (source='rinkel') + participant linking
- [ ] Stap 8: Summarizer op call transcript
- [ ] Stap 9: Extractor + save extractions met entity resolution
- [ ] Stap 10: Embeddings genereren
- [ ] Title generatie voor calls (geen Fireflies titel beschikbaar)
- [ ] Webhook route updaten: na audio opslag → processCall() aanroepen
- [ ] Error handling: non-blocking stappen (net als Fireflies pipeline)

## Acceptatiecriteria

- [ ] [VOIP-010] Audio uit Supabase Storage wordt succesvol getranscribeerd via ElevenLabs
- [ ] [VOIP-011] Bekend telefoonnummer → person match met organisatie
- [ ] [VOIP-012] Intern/extern classificatie werkt op basis van phone match
- [ ] [VOIP-013] Gatekeeper classificeert calls correct (meeting_type, relevance_score)
- [ ] [VOIP-014] Organisatie wordt gekoppeld via gatekeeper + phone lookup
- [ ] [VOIP-015] Meeting record met source='rinkel' en verification_status='draft'
- [ ] [VOIP-016] AI briefing wordt gegenereerd voor call
- [ ] [VOIP-017] Extractions (decisions, action_items, needs, insights) worden correct geëxtraheerd
- [ ] [VOIP-018] Projecten worden gematcht op basis van gesprekscontent
- [ ] [VOIP-019] Meeting + extraction embeddings worden gegenereerd
- [ ] [VOIP-020] Call verschijnt in review queue als draft meeting

## Geraakt door deze sprint

- `packages/ai/src/pipeline/call-pipeline.ts` (nieuw — hoofdpipeline voor calls)
- `packages/ai/src/pipeline/phone-resolver.ts` (nieuw — telefoon → persoon matching)
- `packages/ai/src/pipeline/participant-classifier.ts` (gewijzigd — phone-based classificatie)
- `apps/cockpit/src/app/api/webhooks/rinkel/route.ts` (gewijzigd — processCall() integratie)

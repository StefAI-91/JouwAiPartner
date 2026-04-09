# Sprint 028: Batch migratie - Bestaande meetings

## Doel

Een batch-verwerkingsscript bouwen dat bestaande verified meetings zonder segmenten opnieuw verwerkt via de nieuwe pipeline (Gatekeeper met project-identificatie -> Tagger -> segment-bouw -> embed). Dit zorgt ervoor dat ook historische meetings doorzoekbaar zijn per project. Het script heeft rate limiting op API calls, progress tracking, logging en een dry-run modus.

## Requirements

| ID       | Beschrijving                                                                                       |
| -------- | -------------------------------------------------------------------------------------------------- |
| FUNC-110 | Batch-verwerkingsscript voor verified meetings zonder segmenten                                    |
| FUNC-111 | Verwerkt meetings via nieuwe pipeline: Gatekeeper -> Tagger -> segment-bouw -> embed               |
| FUNC-112 | Rate limiting op API calls (Gatekeeper + Cohere embeddings)                                        |
| FUNC-113 | Progress tracking en logging (verwerkt X van Y, errors per meeting)                                |
| FUNC-114 | Dry-run modus: toon wat er zou veranderen zonder op te slaan                                       |
| RULE-019 | Batch migratie raakt alleen meetings ZONDER bestaande segmenten (geen overschrijven)               |
| RULE-020 | Batch migratie wijzigt NIET de meeting.summary of meeting.ai_briefing (alleen segmenten toevoegen) |

## Bronverwijzingen

- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "6. Impact op bestaande data" (regels 347-354)
- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "3.2 Pipeline: segmenten bouwen" (regels 144-161) -- pipeline flow

## Context

### Relevante business rules

- **RULE-019**: "Het script verwerkt alleen meetings die nog geen segmenten hebben (geen rij in `meeting_project_summaries`). Meetings die al segmenten hebben worden overgeslagen."
- **RULE-020**: "De batch migratie voegt alleen segmenten toe. De bestaande meeting.summary en meeting.ai_briefing worden NIET gewijzigd."

### Batch-verwerkingsflow

Per meeting:

1. Haal meeting op met summary, kernpunten (uit rich summary), transcript (voor Gatekeeper)
2. Haal database-context op (projecten, organisaties, personen) -- hergebruik context-injection uit sprint 021
3. Draai Gatekeeper met project-identificatie -- hergebruik uit sprint 021
4. Als Gatekeeper projecten identificeert: draai Tagger -- hergebruik uit sprint 022
5. Bouw segmenten -- hergebruik uit sprint 022
6. embedBatch() voor alle segmenten -- hergebruik uit sprint 022
7. Sla segmenten op in meeting_project_summaries
8. Link projecten in meeting_projects met source='ai' (als niet al gelinkt)

### Rate limiting

- Gatekeeper (Claude Haiku): max 10 requests/seconde (Anthropic rate limit)
- Cohere embed-v4: max 100 requests/minuut (Cohere rate limit)
- Implementeer via simpele sleep/delay tussen batches, geen externe rate limiter nodig
- Verwerk meetings in batches van 10 met pauze ertussen

### Progress tracking

```
[2026-04-10 14:30:01] Batch migratie gestart
[2026-04-10 14:30:01] Gevonden: 87 meetings zonder segmenten
[2026-04-10 14:30:05] [1/87] "Team Sync 3 maart" -- 3 segmenten aangemaakt
[2026-04-10 14:30:08] [2/87] "Discovery call Acme" -- 2 segmenten aangemaakt
[2026-04-10 14:30:11] [3/87] "Interne sync" -- 1 segment (Algemeen, 0 projecten)
[2026-04-10 14:30:14] [4/87] "Sales call Beta" -- ERROR: Gatekeeper timeout (skipped)
...
[2026-04-10 14:45:30] Batch migratie voltooid: 83/87 verwerkt, 4 errors
```

### Dry-run modus

Met `--dry-run` flag toont het script wat er zou veranderen zonder daadwerkelijk op te slaan:

```
[DRY RUN] "Team Sync 3 maart" -- zou 3 segmenten aanmaken:
  - Project Alpha (3 kernpunten, 1 vervolgstap)
  - Project Beta (1 kernpunt)
  - Algemeen (2 kernpunten)
```

### Query voor meetings zonder segmenten

```sql
SELECT m.id, m.title, m.summary, m.transcript, m.date, m.organization_id
FROM meetings m
WHERE m.verification_status = 'verified'
  AND NOT EXISTS (
    SELECT 1 FROM meeting_project_summaries mps
    WHERE mps.meeting_id = m.id
  )
ORDER BY m.date DESC
```

### Bestaande code (hergebruik)

- Context-injection: `packages/ai/src/pipeline/context-injection.ts` (sprint 021)
- Gatekeeper agent: `packages/ai/src/agents/gatekeeper.ts` (sprint 021)
- Tagger: `packages/ai/src/pipeline/tagger.ts` (sprint 022)
- Segment-builder: `packages/ai/src/pipeline/segment-builder.ts` (sprint 022)
- embedBatch: `packages/ai/src/embeddings.ts`
- Segment mutations: `packages/database/src/mutations/meeting-project-summaries.ts` (sprint 022)

### Edge cases en foutafhandeling

- Meeting zonder transcript: skip (Gatekeeper heeft transcript nodig). Log warning.
- Meeting zonder summary/kernpunten: skip (Tagger heeft kernpunten nodig). Log warning.
- Gatekeeper timeout/error op individuele meeting: log error, skip meeting, ga door met volgende.
- Cohere embedding error: log error, segmenten opslaan met embedding_stale=true (re-embed worker pikt het op).
- Script wordt afgebroken halverwege: veilig -- meetings die al verwerkt zijn behouden hun segmenten, onverwerkte meetings worden bij volgende run opgepikt.
- Idempotent: als het script opnieuw gedraaid wordt, worden alleen meetings zonder segmenten verwerkt (RULE-019).

## Prerequisites

- [ ] Sprint 021: Gatekeeper uitbreiding - Project-identificatie moet afgerond zijn
- [ ] Sprint 022: Tagger + Segment-bouw moet afgerond zijn

## Taken

- [ ] Query functie in `packages/database/src/queries/meetings.ts`: haal verified meetings op zonder segmenten
- [ ] Batch-script bouwen in `packages/ai/src/scripts/batch-segment-migration.ts`: main loop met rate limiting, progress tracking, error handling
- [ ] Dry-run modus implementeren: --dry-run flag die output toont zonder op te slaan
- [ ] Rate limiting helper: sleep/delay functie tussen batches (10 meetings per batch, 2s pauze)
- [ ] Integratie met bestaande pipeline functies: context-injection, Gatekeeper, Tagger, segment-builder, embedBatch
- [ ] Tests: integration tests voor batch verwerking met mock data (Gatekeeper + Tagger + opslag), dry-run modus test

## Acceptatiecriteria

- [ ] [FUNC-110] Script verwerkt verified meetings zonder segmenten
- [ ] [FUNC-111] Pipeline flow is correct: Gatekeeper -> Tagger -> segment-bouw -> embed -> opslaan
- [ ] [FUNC-112] Rate limiting is actief: geen API rate limit errors bij batch van 50+ meetings
- [ ] [FUNC-113] Progress wordt gelogd: X/Y verwerkt, errors per meeting
- [ ] [FUNC-114] Dry-run modus toont wat er zou veranderen zonder op te slaan
- [ ] [RULE-019] Meetings met bestaande segmenten worden overgeslagen
- [ ] [RULE-020] meeting.summary en meeting.ai_briefing worden niet gewijzigd
- [ ] Script is idempotent: opnieuw draaien verwerkt alleen onverwerkte meetings
- [ ] Errors op individuele meetings blokkeren niet de rest van de batch

## Geraakt door deze sprint

- `packages/ai/src/scripts/batch-segment-migration.ts` (nieuw)
- `packages/database/src/queries/meetings.ts` (gewijzigd -- query voor meetings zonder segmenten)

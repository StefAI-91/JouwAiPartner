# Sprint 005: Extractor + embedding + pipeline

**Fase:** 1 — Pipeline
**Doel:** Meetings worden volledig verwerkt: triage + extractie + embedding. Alles doorzoekbaar.

## Requirements

FUNC-005..008, FUNC-014..018, AI-003..007, RULE-001, RULE-003, RULE-004, RULE-006

## Bestaande code

- `src/lib/services/gatekeeper-pipeline.ts` — pipeline flow, uitbreiden met Extractor stap
- `src/lib/services/save-extractions.ts` — slaat op naar oude tabellen (decisions, action_items). Herschrijven naar `extractions` tabel.
- `src/lib/services/entity-resolution.ts` — project-koppeling uitbreiden met 3-tier (embedding match)
- `src/lib/services/re-embed-worker.ts` — re-embed worker, aanpassen voor nieuw schema
- `src/lib/services/impact-check.ts` — niet meer nodig in nieuwe architectuur, kan weg

## Scope

1. Extractor agent (Sonnet): decisions, action_items, needs, insights met confidence + transcript_ref
2. Extractie gestuurd door meeting_type
3. Transcript_ref validatie (string match, confidence → 0 bij mismatch)
4. `save-extractions.ts` herschrijven: opslaan in unified `extractions` tabel
5. Project-koppeling: 3-tier entity resolution (exact → alias → embedding)
6. raw_fireflies JSONB vullen (Fireflies + Gatekeeper + Extractor output)
7. Meeting + extractions direct embedden via Cohere embed-v4
8. `re-embed-worker.ts` aanpassen (embedding_stale, meeting verrijking)
9. `impact-check.ts` verwijderen
10. Prompt caching voor Extractor system prompt

## Taken

- [ ] Extractor agent bouwen: `src/lib/agents/extractor.ts`
- [ ] Transcript_ref validatie implementeren
- [ ] `save-extractions.ts` herschrijven voor `extractions` tabel
- [ ] Pipeline integratie: Gatekeeper → Extractor → opslag
- [ ] Project-koppeling 3-tier in entity-resolution.ts
- [ ] raw_fireflies JSONB vullen
- [ ] Embedding: meeting + extractions via Cohere
- [ ] `re-embed-worker.ts` aanpassen
- [ ] `impact-check.ts` verwijderen
- [ ] `pending-matches-digest.ts` verwijderen (niet meer nodig)

## Testbaar

- Webhook → meeting + extracties in DB met confidence + transcript_ref
- Sales meeting levert needs + client_info insights
- Alles geembed → vindbaar via search_all_content()
- Ongeldige transcript_ref → confidence = 0.0

## Demo-moment (Fase 1 compleet)

Stuur een echte Fireflies webhook. De meeting wordt automatisch verwerkt. Stel via Claude de vraag: "Wat is er besloten in de meeting van vandaag?"

## Geraakt

- `src/lib/agents/extractor.ts` (nieuw)
- `src/lib/services/gatekeeper-pipeline.ts` (Extractor integratie)
- `src/lib/services/save-extractions.ts` (herschrijven)
- `src/lib/services/entity-resolution.ts` (3-tier)
- `src/lib/services/re-embed-worker.ts` (aanpassen)
- `src/lib/services/impact-check.ts` (verwijderen)
- `src/lib/services/pending-matches-digest.ts` (verwijderen)

# Sprint 005: Extractor + embedding + pipeline

**Fase:** 1 — Pipeline
**Doel:** Meetings worden volledig verwerkt: triage + extractie + embedding. Alles doorzoekbaar.

## Requirements

FUNC-005..008, FUNC-014..018, AI-003..007, RULE-001, RULE-003, RULE-004, RULE-006

## Scope

1. Extractor agent (Sonnet): decisions, action_items, needs, insights
2. Per extractie: content, confidence, transcript_ref, metadata
3. Extractie gestuurd door meeting_type (zie type-extractie matrix)
4. Transcript_ref validatie: string match tegen transcript, confidence → 0 bij mismatch
5. Extracties opslaan in extractions tabel
6. Project-koppeling: 3-tier (exact → alias → embedding via match_projects())
7. raw_fireflies JSONB vullen (Fireflies + Gatekeeper + Extractor output)
8. Meeting + extractions direct embedden via Cohere embed-v4
9. Re-embed worker aanpassen (embedding_stale, meeting verrijking met insights)
10. Prompt caching voor Extractor system prompt

## Taken

- [ ] Extractor agent bouwen: schema, prompt per meeting_type
- [ ] Transcript_ref validatie implementeren
- [ ] Integratie in pipeline: na Gatekeeper, voor opslag
- [ ] Extracties opslaan in extractions tabel
- [ ] Project-koppeling (3-tier entity resolution)
- [ ] raw_fireflies JSONB vullen
- [ ] Meeting + extractions embedden via Cohere
- [ ] Re-embed worker aanpassen

## Testbaar

- Webhook → meeting + extracties in DB met confidence + transcript_ref
- Sales meeting levert needs + client_info insights
- Internal_sync levert project_update insights
- Alles geembed → vindbaar via search_all_content()
- Ongeldige transcript_ref → confidence = 0.0

## Demo-moment (Fase 1 compleet)

Stuur een echte Fireflies webhook. De meeting wordt automatisch verwerkt. Stel via Claude de vraag: "Wat is er besloten in de meeting van vandaag?" → antwoord binnen 30 seconden.

## Geraakt

- `src/lib/agents/extractor.ts` (nieuw)
- `src/lib/services/gatekeeper-pipeline.ts` (Extractor integratie)
- `src/lib/services/entity-resolution.ts` (project-koppeling 3-tier)
- `src/lib/services/re-embed-worker.ts` (aanpassing)

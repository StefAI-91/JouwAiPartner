# Sprint 004: Fireflies webhook + Gatekeeper triage

**Fase:** 1 — Pipeline
**Doel:** Meetings komen automatisch binnen via Fireflies en worden geclassificeerd.

## Requirements

FUNC-001..004, FUNC-009..013, FUNC-025..026, AI-001..002, AI-006

## Scope

1. Fireflies webhook ontvanger (Edge Function of API route)
2. Fireflies GraphQL API integratie (transcript ophalen)
3. Pre-filter: meetings < 2 min → skip, meetings < 2 deelnemers → skip
4. Gatekeeper agent (Haiku 4.5): meeting_type, party_type, relevance_score, organization_name
5. Prompt caching voor system prompt
6. Novelty check (duplicaat-detectie via fireflies_id)
7. Organisatie-koppeling: exact match → alias match → unmatched_organization_name
8. Deelnemer-matching: email → meeting_participants, fallback → participants text[]
9. Meeting opslaan met classificatie

## Taken

- [ ] Webhook ontvanger bouwen
- [ ] Fireflies GraphQL API integratie
- [ ] Pre-filter implementeren (duur + deelnemers)
- [ ] Gatekeeper agent: schema + prompt (alleen classificatie)
- [ ] Prompt caching inschakelen voor system prompt
- [ ] Novelty check op fireflies_id
- [ ] Organisatie-koppeling (2-tier: exact → alias → fallback)
- [ ] Deelnemer-matching (email → meeting_participants)
- [ ] Meeting opslaan met alle classificatie-velden

## Testbaar

- Webhook sturen → meeting in DB met meeting_type, party_type, relevance_score
- Bekende organisatie → organization_id gevuld
- Onbekende organisatie → unmatched_organization_name gevuld
- Bekende deelnemer → rij in meeting_participants
- Duplicate fireflies_id → geen dubbele opslag

## Geraakt

- Webhook ontvanger (nieuw)
- `src/lib/agents/gatekeeper.ts` (schema + prompt)
- `src/lib/services/gatekeeper-pipeline.ts` (pipeline flow)
- `src/lib/services/entity-resolution.ts` (org + deelnemer matching)

# Sprint 004: Fireflies webhook + Gatekeeper triage

**Fase:** 1 — Pipeline
**Doel:** Meetings komen automatisch binnen via Fireflies en worden geclassificeerd.

## Requirements

FUNC-001..004, FUNC-009..013, FUNC-025..026, AI-001..002, AI-006

## Bestaande code

- `src/lib/agents/gatekeeper.ts` — bestaat, maar doet te veel (extracties + classificatie). Moet gestript worden tot alleen triage.
- `src/lib/services/gatekeeper-pipeline.ts` — bestaat, pipeline flow. Moet aangepast: reject-logica weg, opslag naar nieuw schema.
- `src/lib/services/entity-resolution.ts` — bestaat, entity matching. Uitbreiden met organisatie-koppeling.
- `src/lib/validations/gatekeeper.ts` — bestaat, Zod schema. Moet versimpeld.

## Scope

1. Fireflies webhook ontvanger (Edge Function of API route)
2. Fireflies GraphQL API integratie (transcript ophalen)
3. Pre-filter: meetings < 2 min → skip, meetings < 2 deelnemers → skip
4. Gatekeeper agent versimpelen: alleen meeting_type, party_type, relevance_score, organization_name
5. Prompt herschrijven: alleen classificatie, geen extractie
6. Reject-logica verwijderen — alles wordt opgeslagen
7. Prompt caching voor system prompt
8. Novelty check (duplicaat-detectie via fireflies_id)
9. Organisatie-koppeling: exact match → alias match → unmatched_organization_name
10. Deelnemer-matching: email → meeting_participants
11. Meeting opslaan met classificatie naar nieuw schema

## Taken

- [ ] Webhook ontvanger bouwen
- [ ] Fireflies GraphQL API integratie
- [ ] Pre-filter implementeren (duur + deelnemers)
- [ ] `gatekeeper.ts` strippen: schema + prompt alleen classificatie
- [ ] `gatekeeper-pipeline.ts` aanpassen: reject-logica weg, nieuw schema, extractie-code weg
- [ ] `entity-resolution.ts` uitbreiden: organisatie-koppeling (2-tier)
- [ ] Deelnemer-matching (email → meeting_participants)
- [ ] Novelty check op fireflies_id
- [ ] Prompt caching inschakelen

## Testbaar

- Webhook sturen → meeting in DB met meeting_type, party_type, relevance_score
- Bekende organisatie → organization_id gevuld
- Onbekende organisatie → unmatched_organization_name gevuld
- Bekende deelnemer → rij in meeting_participants
- Duplicate fireflies_id → geen dubbele opslag

## Geraakt

- Webhook ontvanger (nieuw)
- `src/lib/agents/gatekeeper.ts` (versimpelen)
- `src/lib/validations/gatekeeper.ts` (versimpelen)
- `src/lib/services/gatekeeper-pipeline.ts` (aanpassen)
- `src/lib/services/entity-resolution.ts` (uitbreiden)

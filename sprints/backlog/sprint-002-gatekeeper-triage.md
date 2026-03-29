# Micro Sprint 002: Gatekeeper Triage (Haiku)

## Doel

De Gatekeeper vereenvoudigen tot pure triage: classificatie en scoring. Alle extractie-logica wordt verwijderd (dat doet de Extractor in sprint 003). Reject-logica verdwijnt — alles wordt opgeslagen. Organisatie- en deelnemer-koppeling werken na deze sprint.

## Requirements

| ID       | Beschrijving                                                                                |
| -------- | ------------------------------------------------------------------------------------------- |
| FUNC-001 | Gatekeeper doet alleen triage: meeting_type, party_type, relevance_score, organization_name |
| FUNC-002 | Gatekeeper rejectt niet meer — alles wordt opgeslagen                                       |
| FUNC-003 | Relevance_score blijft voor ranking                                                         |
| FUNC-004 | Novelty check (duplicaat-detectie) blijft actief                                            |
| FUNC-009 | Organisatie-koppeling via 2-tier: exact → alias                                             |
| FUNC-010 | Bij geen match: unmatched_organization_name vullen                                          |
| FUNC-011 | Deelnemer-matching via email tegen people tabel                                             |
| FUNC-012 | Bij match: rij in meeting_participants                                                      |
| FUNC-013 | Geen match: blijft in meetings.participants text[]                                          |
| AI-001   | GatekeeperSchema: meeting_type, party_type, relevance_score, organization_name              |
| AI-002   | Gatekeeper prompt: alleen classificatie, geen extractie                                     |

## Bronverwijzingen

- PRD: `docs/specs/meeting-processing-review.md` -> sectie 5.1 "Stap 1: Gatekeeper (Haiku)"
- PRD: `docs/specs/meeting-processing-review.md` -> sectie 5.3 "Organisatie-koppeling"
- PRD: `docs/specs/meeting-processing-review.md` -> sectie 5.4 "Deelnemer-koppeling"
- PRD: `docs/specs/meeting-processing-review.md` -> sectie 4 "Meeting Types"

## Context

### Huidige situatie

De Gatekeeper doet nu te veel in één call:

- Scoren + classificeren
- Decisions, action_items, project_updates, strategy_ideas, client_info extraheren
- Pass/reject beslissing nemen

### Nieuwe situatie

De Gatekeeper doet alleen:

1. `meeting_type` classificeren uit vaste lijst van 7
2. `party_type` bepalen (client/partner/internal/other)
3. `relevance_score` toekennen (0.0-1.0)
4. `organization_name` extraheren (nullable)

Alles wat met inhoudelijke extractie te maken heeft (decisions, action_items, needs, insights) verhuist naar de Extractor (sprint 003).

### GatekeeperSchema (nieuw)

```typescript
const GatekeeperSchema = z.object({
  meeting_type: z.enum([
    "sales",
    "discovery",
    "internal_sync",
    "review",
    "strategy",
    "partner",
    "general",
  ]),
  party_type: z.enum(["client", "partner", "internal", "other"]),
  relevance_score: z.number().min(0).max(1),
  organization_name: z.string().nullable(),
});
```

### Organisatie-koppeling (2-tier)

```
organization_name van Gatekeeper
  → ILIKE match op organizations.name
  → ANY match op organizations.aliases
  → geen match? → meetings.unmatched_organization_name
```

### Deelnemer-koppeling

```
Fireflies email per deelnemer
  → match op people.email
  → match? → INSERT meeting_participants
  → geen match? → blijft in meetings.participants text[]
```

## Prerequisites

- Sprint 001 (database) is afgerond

## Taken

- [ ] `GatekeeperSchema` strippen: verwijder action, decisions, action_items, project_updates, strategy_ideas, client_info, entities
- [ ] `GatekeeperSchema` uitbreiden: meeting_type, party_type, organization_name (als die er nog niet zijn)
- [ ] Gatekeeper prompt herschrijven: alleen classificatie-instructies, meeting type lijst, party type regels
- [ ] Reject-logica verwijderen uit `gatekeeper-pipeline.ts` — alle meetings worden opgeslagen
- [ ] Organisatie-koppeling implementeren: exact match → alias match → fallback unmatched_organization_name
- [ ] Deelnemer-matching implementeren: email → meeting_participants, fallback → participants text[]
- [ ] Meeting opslaan met nieuwe velden: meeting_type, party_type, relevance_score, organization_id/unmatched_organization_name
- [ ] Pipeline-code aanpassen aan nieuw schema: alle verwijzingen naar oude tabellen (decisions, action_items, content_reviews) verwijderen uit gatekeeper-pipeline.ts — opslag van extracties verhuist naar sprint 003
- [ ] Pre-filter aanpassen: `participants.length < 2` (solo-recording is geen gesprek) en `duration < 2 min`
- [ ] Test: webhook → meeting geclassificeerd + org gekoppeld + deelnemers gematcht

## Acceptatiecriteria

- [ ] [FUNC-001] Gatekeeper output bevat alleen meeting_type, party_type, relevance_score, organization_name
- [ ] [FUNC-002] Meeting met lage score wordt NIET meer gerejectt
- [ ] [FUNC-004] Duplicate meeting (zelfde fireflies_id) wordt nog steeds gedetecteerd
- [ ] [FUNC-009..010] Bekende org wordt gekoppeld via organization_id, onbekende via unmatched_organization_name
- [ ] [FUNC-011..013] Bekende deelnemers in meeting_participants, onbekende in participants text[]
- [ ] [AI-001..002] Geen extracties (decisions, action_items, etc.) in Gatekeeper output
- [ ] Handmatige test: webhook sturen → meeting in DB met correcte classificatie

## Schema-compatibiliteit

De bestaande code verwijst naar oude tabellen (`decisions`, `action_items`, `content_reviews`). In deze sprint wordt de pipeline-code aangepast zodat:

- Gatekeeper-output alleen triage-velden bevat (geen extracties)
- Meeting-opslag naar het nieuwe `meetings` schema schrijft (zonder `requires_review`)
- Alle verwijzingen naar oude extractie-tabellen verwijderd worden uit de pipeline
- De pipeline na deze sprint alleen meetings opslaat — extractie-opslag komt in sprint 003

## Geraakt door deze sprint

- `src/lib/agents/gatekeeper.ts` (schema + prompt)
- `src/lib/services/gatekeeper-pipeline.ts` (reject-logica weg, opslag aangepast aan nieuw schema, extractie-code verwijderd)
- `src/lib/services/entity-resolution.ts` (org-koppeling uitbreiden)

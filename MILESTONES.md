# Milestones & Fases

_Project: JouwAIPartner v1_
_Bijgewerkt: 2026-03-29_

---

## Overzicht

Het project is opgedeeld in **3 fases** met **8 sprints**. Elke fase heeft een duidelijke mijlpaal met een tastbaar resultaat dat je kunt demonstreren. Elke sprint is klein genoeg om in 1-2 sessies af te ronden.

```
Fase 0: Walking Skeleton        → "De keten werkt"
Fase 1: Pipeline                 → "Meetings worden automatisch verwerkt"
Fase 2: Dagelijks bruikbaar      → "Het team gebruikt dit elke dag"
```

---

## Fase 0: Walking Skeleton

> **Mijlpaal:** Een meeting handmatig inserten en terugvinden via MCP.
> **Doel:** Bewijs dat de keten database → embedding → MCP werkt, voordat je automatisering bouwt.
> **Demo:** "Ik stel een vraag via Claude en krijg een antwoord uit onze eigen database."

| Sprint | Wat                                        | Tastbaar resultaat                                    |
| ------ | ------------------------------------------ | ----------------------------------------------------- |
| 001    | Core tabellen + triggers                   | Tabellen bestaan, seed data erin, types gegenereerd   |
| 002    | Indexes + search functions + embed utility | `search_all_content()` retourneert resultaten         |
| 003    | Basis MCP server + search_knowledge tool   | Via MCP een vraag stellen → antwoord uit de database  |

### Sprint 001: Core tabellen + triggers

**Scope:**
- Extensions: vector, pg_cron, pg_net
- 8 tabellen: profiles, organizations, people, projects, meetings, meeting_projects, meeting_participants, extractions
- Auth trigger voor profiles
- search_vector triggers op meetings en extractions
- Supabase TypeScript types regenereren

**Testbaar:** Migraties draaien zonder fouten. Handmatig een meeting INSERT werkt.

**Requirements:** DATA-001..041, DATA-050..052

---

### Sprint 002: Indexes, search functions, seed data, embed utility

**Scope:**
- HNSW vector indexes op alle embedding-kolommen
- GIN indexes op search_vector kolommen
- B-tree indexes op FK-kolommen en filters
- Search functions: `search_all_content()`, `match_people()`, `match_projects()`, `search_meetings_by_participant()`
- pg_cron schedule voor re-embed worker
- Seed script met initiele organizations, people en projects (idempotent)
- Cohere embed-v4 utility (`src/lib/utils/embed.ts`)

**Testbaar:** Seed data staat in de database. Een handmatig geembedde meeting is vindbaar via `search_all_content()`.

**Requirements:** DATA-042..049, DATA-053, FUNC-019, FUNC-027, FUNC-028

---

### Sprint 003: Basis MCP server + search_knowledge

**Scope:**
- MCP server setup (TypeScript/Node.js)
- `search_knowledge` tool: embed query via Cohere → vector search → resultaten met meeting titel en datum
- Verbinding testen met Claude client

**Testbaar:** Via Claude/MCP de vraag "wat weten we over [project]?" stellen en een antwoord krijgen op basis van de seed data + handmatig ingevoerde meeting.

**Requirements:** FUNC-020 (basis), MCP-001 (basis)

**Demo-moment Fase 0:** Laat aan het team zien dat je via Claude vragen kunt stellen over jullie eigen data. Het is nog handmatig ingevoerd, maar de keten werkt.

---

## Fase 1: Pipeline

> **Mijlpaal:** Een echte Fireflies meeting wordt automatisch verwerkt en is doorzoekbaar.
> **Doel:** Automatische ingestion: webhook → triage → extractie → embedding → doorzoekbaar.
> **Demo:** "Er komt een meeting binnen via Fireflies en 30 seconden later kan ik er vragen over stellen."

| Sprint | Wat                                           | Tastbaar resultaat                                          |
| ------ | --------------------------------------------- | ----------------------------------------------------------- |
| 004    | Fireflies webhook + pre-filter + Gatekeeper   | Meeting binnenkomst → geclassificeerd + org gekoppeld in DB |
| 005    | Extractor + embedding + volledige pipeline     | Meeting → extracties met confidence + alles geembed + vindbaar |

### Sprint 004: Webhook + Gatekeeper triage

**Scope:**
- Fireflies webhook ontvanger (Edge Function of API route)
- Pre-filter: meetings < 2 min of < 2 deelnemers → skip
- Gatekeeper agent (Haiku 4.5): meeting_type, party_type, relevance_score, organization_name
- Prompt caching voor system prompt
- Novelty check (duplicaat-detectie via fireflies_id)
- Organisatie-koppeling: 2-tier (exact match → alias match → unmatched_organization_name)
- Deelnemer-matching: email → meeting_participants
- Meeting opslaan met classificatie

**Testbaar:** Webhook sturen → meeting verschijnt in DB met meeting_type, party_type, relevance_score en organisation gekoppeld.

**Requirements:** FUNC-001..004, FUNC-009..013, FUNC-025..026, AI-001..002, AI-006

---

### Sprint 005: Extractor + embedding + pipeline

**Scope:**
- Extractor agent (Sonnet): decisions, action_items, needs, insights met confidence + transcript_ref
- Extractie gestuurd door meeting_type
- Transcript_ref validatie (string match tegen transcript, confidence → 0 bij mismatch)
- Extracties opslaan in extractions tabel
- Project-koppeling: 3-tier entity resolution (exact → alias → embedding)
- raw_fireflies JSONB vullen (Fireflies + Gatekeeper + Extractor output)
- Meeting + extractions direct embedden via Cohere embed-v4
- Re-embed worker aanpassen (embedding_stale, meeting verrijking)
- Prompt caching voor Extractor system prompt

**Testbaar:** Webhook → meeting + extracties in DB met confidence + transcript_ref → alles geembed → vindbaar via `search_all_content()`.

**Requirements:** FUNC-005..008, FUNC-014..018, AI-003..007, RULE-001, RULE-003, RULE-004, RULE-006

**Demo-moment Fase 1:** Stuur een echte Fireflies webhook. Laat zien dat de meeting automatisch verwerkt wordt en dat je er direct vragen over kunt stellen via Claude. "Wat is er besloten in de meeting van vandaag?"

---

## Fase 2: Dagelijks bruikbaar

> **Mijlpaal:** Het team gebruikt dit dagelijks om vragen te stellen over klantgesprekken.
> **Doel:** Alle MCP tools werken met bronvermelding. Organisatie-overzichten. Correctiemogelijkheid.
> **Demo:** "Geef me alles over klant X" → compleet overzicht met bronnen en confidence.

| Sprint | Wat                                             | Tastbaar resultaat                                        |
| ------ | ----------------------------------------------- | --------------------------------------------------------- |
| 006    | MCP core tools + bronvermelding                 | get_decisions, get_action_items, get_meeting_summary werken met bron |
| 007    | MCP overzicht-tools + correctie                 | get_organization_overview, list_meetings, correct_extraction |

### Sprint 006: MCP core tools + bronvermelding

**Scope:**
- `search_knowledge` uitbreiden: bronvermelding + confidence + transcript_ref + verificatie-status
- `get_decisions`: filter type='decision', join meetings voor bron, made_by/date/context uit metadata
- `get_action_items`: filter type='action_item', assignee/due_date/status uit metadata
- `get_meeting_summary`: meeting_type, party_type, organization, deelnemers, alle extracties
- Elk antwoord toont "AI (confidence: 0.87)" of "geverifieerd door [naam]"

**Testbaar:** Via MCP: "wat is er besloten over project X?" → antwoord met meeting titel, datum, transcript quote en confidence score.

**Requirements:** FUNC-020..023, MCP-001..005, RULE-002

---

### Sprint 007: Overzicht-tools + correctie

**Scope:**
- `get_organization_overview`: JOIN organizations → meetings → extractions → projects → people. Puur SQL, geen vector search.
- `list_meetings`: filters op organization, project, date_from, date_to, meeting_type, party_type. Pagination.
- `correct_extraction`: content/metadata overschrijven, corrected_by + corrected_at zetten, embedding_stale=true
- Tool descriptions updaten voor LLM-clients

**Testbaar:** "Geef me alles over klant X" → compleet overzicht. "Corrigeer die extractie" → bij volgende query zichtbaar als "geverifieerd door [naam]".

**Requirements:** FUNC-024, FUNC-029..030, MCP-006..008

**Demo-moment Fase 2:** Laat het team los op de MCP tools. Stel realistische vragen: "Wanneer spraken we klant Y laatst?", "Wat zijn de openstaande actiepunten?", "Geef me een overzicht van klant Z". Alles met bronvermelding.

---

## Definitie of Done (v1 compleet)

- [ ] Meeting binnenkomst via webhook → classificatie → extractie → opslag → embedding → doorzoekbaar via MCP
- [ ] Elk MCP-antwoord bevat bronvermelding (meeting titel, datum, transcript quote)
- [ ] Elk MCP-antwoord toont confidence score of "geverifieerd door [naam]"
- [ ] Extracties zijn corrigeerbaar via MCP `correct_extraction` tool
- [ ] Organisatie-overzichten beschikbaar via `get_organization_overview`
- [ ] Meetings filterbaar via `list_meetings`
- [ ] Seed data (organizations, people, projects) staat in de database
- [ ] Team kan dagelijks vragen stellen over klantgesprekken en krijgt bruikbare antwoorden

---

## Visueel overzicht

```
FASE 0: Walking Skeleton
  Sprint 001 ──► Sprint 002 ──► Sprint 003
  [tabellen]     [indexes]      [basis MCP]
                                     │
                              DEMO: "De keten werkt"
                                     │
FASE 1: Pipeline                     ▼
  Sprint 004 ──────────► Sprint 005
  [webhook+gatekeeper]   [extractor+embedding]
                                     │
                              DEMO: "Meetings worden automatisch verwerkt"
                                     │
FASE 2: Dagelijks bruikbaar          ▼
  Sprint 006 ──────────► Sprint 007
  [MCP core tools]       [overzicht+correctie]
                                     │
                              DEMO: "Het team gebruikt dit elke dag"
```

---

## Spelregels

1. **Geen sprint starten zonder de vorige af te ronden** — elke sprint bouwt voort op de vorige
2. **Demo na elke fase** — laat iets werkends zien, hoe klein ook
3. **Sprint te groot? Splits.** — als een sprint meer dan 2 sessies kost, breek hem op
4. **Afgeronde sprints** → verplaats van `sprints/backlog/` naar `sprints/done/`
5. **Scope wijzigt? Update dit document** — MILESTONES.md is de bron van waarheid voor planning

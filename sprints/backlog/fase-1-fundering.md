# Fase 1: Fundering

> **Doel:** Pipeline werkt end-to-end. Meetings verwerken via webhook, direct doorzoekbaar via MCP met bronvermelding. Geen review-gate, geen UI.
> **PRD:** `docs/specs/meeting-processing-review.md` (v2)
> **Sprints:** 4
> **Tabellen:** 8

---

## Overzicht

| Sprint | Inhoud                                                   | Resultaat                                                 |
| ------ | -------------------------------------------------------- | --------------------------------------------------------- |
| 001    | Database: alle tabellen, indexes, search functions, cron | Schema staat, search werkt                                |
| 002    | Gatekeeper triage (Haiku): type, score, org, deelnemers  | Meetings worden geclassificeerd en gekoppeld              |
| 003    | Extractor (Sonnet) + pipeline opslag + Cohere embedding  | Extracties met confidence + bronvermelding, alles geembed via Cohere embed-v4 (1024-dim) |
| 004    | MCP tools + bronvermelding + ophaal-tools                | Team kan zoeken, filteren en complete klantoverzichten opvragen met bron |

---

## Sprint 001: Database — Alle tabellen, indexes, search, cron

**Wat:** Clean slate. Verwijder alle bestaande migraties. Zet het volledige schema op: 8 tabellen, vector indexes, search functions en cron scheduling.

**Voorbereiding:**

- Bestaande migratie-bestanden verwijderen uit `supabase/migrations/`
- Alle bestaande tabellen droppen in Supabase
- `supabase_migrations` tabel resetten

**Scope:**

1. Extensions: vector, pg_cron, pg_net
2. `profiles` met auth trigger (auto-create bij registratie)
3. `organizations`, `people`, `projects` als basis-entiteiten
4. `meetings` (zonder requires_review — dat concept bestaat niet meer)
5. `meeting_projects`, `meeting_participants` koppeltabellen
6. `extractions` met confidence, transcript_ref, metadata JSONB, corrected_by/corrected_at
7. HNSW vector indexes op alle embedding-kolommen
8. B-tree indexes op FK-kolommen en veelgebruikte filters
9. `search_all_content()`, `match_people()`, `match_projects()`, `search_meetings_by_participant()`
10. pg_cron schedule voor re-embed worker (elke 5 min)
11. Supabase TypeScript types regenereren
12. Seed script met initiële organizations, people en projects

**Testbaar:** Migraties draaien zonder fouten. Seed data staat in tabellen. Handmatig een meeting + extractie inserten. `search_all_content()` retourneert resultaten.

---

## Sprint 002: Gatekeeper Triage (Haiku)

**Wat:** Gatekeeper vereenvoudigen tot pure triage. Geen extracties meer.

**Scope:**

- `GatekeeperSchema` strippen tot: meeting_type, party_type, relevance_score, organization_name
- Prompt aanpassen: alleen classificatie
- Reject-logica verwijderen — alles wordt opgeslagen
- Novelty check blijft actief
- Organisatie-koppeling: 2-tier (exact → alias)
- Deelnemer-matching: email → meeting_participants
- Fallback: unmatched_organization_name, participants text[]

**Testbaar:** Webhook → meeting heeft type + party_type + org koppeling. Geen extracties in output.

---

## Sprint 003: Extractor (Sonnet) + Pipeline + Embedding

**Wat:** Nieuwe Extractor agent. Pipeline opslag en embedding zonder review-gate.

**Scope:**

- Extractor agent (Sonnet): decisions, action_items, needs, insights
- Per extractie: content, confidence, transcript_ref, metadata
- Extractie gestuurd door meeting_type
- Pipeline: meeting + extractions opslaan in één flow
- raw_fireflies JSONB: Fireflies + Gatekeeper + Extractor output
- Alles direct embedden
- Re-embed worker: embedding_stale verwerken, meeting verrijken met insights
- Project-koppeling: 3-tier entity resolution

**Testbaar:** Webhook → extractions in DB met confidence + transcript_ref. Alles geembed. Vindbaar via search_all_content().

---

## Sprint 004: MCP Tools + Bronvermelding

**Wat:** MCP tools updaten zodat het team via elke LLM-client vragen kan stellen met bronvermelding.

**Scope:**

- search_knowledge: meetings + extractions, bron + confidence + transcript_ref + verificatie-status
- get_decisions: filter type='decision', bronvermelding
- get_action_items: filter type='action_item', assignee/due_date/status uit metadata
- get_meeting_summary: meeting detail met alle nieuwe velden
- correct_extraction: corrigeer content/metadata, zet corrected_by/corrected_at

**Testbaar:** Via MCP: "wat is er besloten over project X?" → antwoord met bron, confidence en transcript quote. Corrigeer een extractie → bij volgende query toont het "geverifieerd door [naam]".

---

## Definitie of Done (hele fase)

- [ ] Meeting binnenkomst via webhook → classificatie → extractie → opslag → embedding → doorzoekbaar via MCP
- [ ] Elk MCP-antwoord bevat bronvermelding (meeting titel, datum, transcript quote)
- [ ] Elk MCP-antwoord toont confidence score of "geverifieerd door [naam]"
- [ ] Extracties zijn corrigeerbaar via MCP `correct_extraction` tool
- [ ] Seed data (organizations, people, projects) staat in de database
- [ ] Team kan dagelijks vragen stellen over klantgesprekken en krijgt bruikbare antwoorden

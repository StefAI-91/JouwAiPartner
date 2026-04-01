# Milestones & Fases

_Project: Jouw AI Partner_
_Updated: 2026-04-01_
_Full spec: `docs/specs/platform-spec.md`_

---

## Overzicht

Het project is opgedeeld in **3 fases** met **7 sprints**. Elke fase heeft een duidelijke mijlpaal met een tastbaar resultaat dat je kunt demonstreren. Elke sprint is klein genoeg om in 1-2 sessies af te ronden.

### Bestaande code

Er is al een werkende codebase met MCP server, Gatekeeper agent, services en search functions. Het schema moet echter fundamenteel veranderen (12 oude tabellen → 8 nieuwe, 1536-dim → 1024-dim Cohere). De sprints bouwen voort op bestaande code waar mogelijk.

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

| Sprint | Wat                                               | Tastbaar resultaat                                   |
| ------ | ------------------------------------------------- | ---------------------------------------------------- |
| 001    | Clean slate DB: drop oud, bouw nieuw + triggers   | Nieuwe tabellen staan, oude weg, types gegenereerd   |
| 002    | Indexes + search functions + Cohere embed utility | `search_all_content()` retourneert resultaten        |
| 003    | Bestaande MCP tools aanpassen voor nieuw schema   | Via MCP een vraag stellen → antwoord uit de database |

### Sprint 001: Clean slate database

**Scope:** Drop 12 oude tabellen (documents, slack_messages, emails, people_skills, people_projects, decisions, action_items, content_reviews, insights + oude meetings/people/projects). Bouw 8 nieuwe tabellen met 1024-dim vectors, search_vector triggers, auth trigger.

**Testbaar:** Oude tabellen weg. Nieuwe migraties draaien. Handmatig een meeting INSERT werkt.

**Requirements:** DATA-001..041, DATA-050..052

---

### Sprint 002: Indexes, search functions, seed data, embed utility

**Scope:** Indexes (HNSW 1024-dim, GIN, B-tree). Search functions herschrijven voor nieuw schema. Seed data. `src/lib/embeddings.ts` vervangen: OpenAI → Cohere embed-v4. pg_cron schedule.

**Testbaar:** Seed data in DB. Meeting met embedding vindbaar via `search_all_content()`.

**Requirements:** DATA-042..049, DATA-053, FUNC-019, FUNC-027, FUNC-028

---

### Sprint 003: MCP tools aanpassen voor nieuw schema

**Scope:** Bestaande MCP server + tools (search, decisions, meetings, actions) aanpassen voor nieuw schema. `pending.ts` verwijderen. Cohere embedding voor search queries.

**Testbaar:** Via Claude/MCP een vraag stellen → antwoord uit de database met seed data.

**Requirements:** FUNC-020 (basis), MCP-001 (basis)

**Demo-moment Fase 0:** Laat aan het team zien dat je via Claude vragen kunt stellen over jullie eigen data. Nog handmatig, maar de keten werkt.

---

## Fase 1: Pipeline

> **Mijlpaal:** Een echte Fireflies meeting wordt automatisch verwerkt en is doorzoekbaar.
> **Doel:** Automatische ingestion: webhook → triage → extractie → embedding → doorzoekbaar.
> **Demo:** "Er komt een meeting binnen via Fireflies en 30 seconden later kan ik er vragen over stellen."

| Sprint | Wat                                         | Tastbaar resultaat                                             |
| ------ | ------------------------------------------- | -------------------------------------------------------------- |
| 004    | Fireflies webhook + pre-filter + Gatekeeper | Meeting binnenkomst → geclassificeerd + org gekoppeld in DB    |
| 005    | Extractor + embedding + volledige pipeline  | Meeting → extracties met confidence + alles geembed + vindbaar |

### Sprint 004: Webhook + Gatekeeper triage

**Scope:** Webhook ontvanger + pre-filter. Bestaande `gatekeeper.ts` versimpelen tot alleen classificatie (strip extractie-code). `gatekeeper-pipeline.ts` aanpassen: reject-logica weg, nieuw schema. `entity-resolution.ts` uitbreiden met org-koppeling.

**Testbaar:** Webhook sturen → meeting in DB met meeting_type, party_type, relevance_score, org gekoppeld.

**Requirements:** FUNC-001..004, FUNC-009..013, FUNC-025..026, AI-001..002, AI-006

---

### Sprint 005: Extractor + embedding + pipeline

**Scope:** Nieuwe Extractor agent (Sonnet). `save-extractions.ts` herschrijven naar `extractions` tabel. `entity-resolution.ts` uitbreiden met 3-tier. `re-embed-worker.ts` aanpassen. `impact-check.ts` en `pending-matches-digest.ts` verwijderen.

**Testbaar:** Webhook → meeting + extracties in DB met confidence + transcript_ref → vindbaar via MCP.

**Requirements:** FUNC-005..008, FUNC-014..018, AI-003..007, RULE-001, RULE-003, RULE-004, RULE-006

**Demo-moment Fase 1:** Stuur een echte Fireflies webhook. "Wat is er besloten in de meeting van vandaag?" → antwoord binnen 30 seconden.

---

## Fase 2: Dagelijks bruikbaar

> **Mijlpaal:** Het team gebruikt dit dagelijks om vragen te stellen over klantgesprekken.
> **Doel:** Alle MCP tools werken met bronvermelding. Organisatie-overzichten. Correctiemogelijkheid.
> **Demo:** "Geef me alles over klant X" → compleet overzicht met bronnen en confidence.

| Sprint | Wat                             | Tastbaar resultaat                                                   |
| ------ | ------------------------------- | -------------------------------------------------------------------- |
| 006    | MCP core tools + bronvermelding | get_decisions, get_action_items, get_meeting_summary werken met bron |
| 007    | MCP overzicht-tools + correctie | get_organization_overview, list_meetings, correct_extraction         |

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

## v1 Status: COMPLETE (2026-03-31)

All 7 sprints (001-007) are done. The meetings pipeline works end-to-end.

- [x] Meeting ingestion via webhook -> classification -> extraction -> storage -> embedding -> searchable via MCP
- [x] Every MCP answer includes source attribution (meeting title, date, transcript quote)
- [x] Every MCP answer shows confidence score or "verified by [name]"
- [x] Extractions are correctable via MCP `correct_extraction` tool
- [x] Organization overviews via `get_organization_overview`
- [x] Meetings filterable via `list_meetings`
- [x] Seed data (organizations, people, projects) in database
- [x] Team can ask daily questions about client meetings and get usable answers

---

## v2 Status: COMPLETE (2026-04-01)

> **Goal:** Make the platform visually usable and add verification gate.
> **Spec:** See `docs/specs/platform-spec.md` section 13 (v2 scope).

- [x] Monorepo setup (Turborepo) — apps/ + packages/ structure
- [x] DB migration: verification_status on meetings and extractions (draft -> verified -> rejected)
- [x] Critical security fixes (SEC-001, SEC-003, SEC-004, SEC-005)
- [x] Review queue UI (quick approve, detailed review, reject)
- [x] Meeting detail page (read-only, verification badge, transcript highlights)
- [x] Projects overview + detail pages (status pipeline, linked meetings/extractions)
- [x] Dashboard home with review attention zone, project cards, recent meetings, open actions
- [x] Clients + People pages
- [x] MCP tools filter on verified content by default
- [x] MCP tools show verification status in output (verified by, date)
- [x] search_all_content() SQL function with verified_only filter

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
                                     │
v2: Review & Dashboard — COMPLETE     ▼
  [verification gate + cockpit UI + MCP filter]
                                     │
                              DEMO: "Review queue, project overview, meeting detail, verified MCP"
                                     │
v3: Client Portal + Second Source    ▼
  [external portal + Google Docs/Email]
```

---

## Future: Smart Queries (v3+)

> Multi-hop queries over the knowledge graph (FK relationships) without a separate graph database.
> Deferred until verification gate is in place and multiple data sources are connected.

**Example questions:**

- "Which decisions about client X contradict each other?"
- "How has the strategy for project X evolved over time?"
- "Which of Pieter's action items relate to client Y?"

**Approach:** MCP tool `smart_query` that builds multi-hop SQL queries from the question. Uses existing FK structure as implicit graph.

---

## Spelregels

1. **Geen sprint starten zonder de vorige af te ronden** — elke sprint bouwt voort op de vorige
2. **Demo na elke fase** — laat iets werkends zien, hoe klein ook
3. **Sprint te groot? Splits.** — als een sprint meer dan 2 sessies kost, breek hem op
4. **Afgeronde sprints** → verplaats van `sprints/backlog/` naar `sprints/done/`
5. **Scope wijzigt? Update dit document** — MILESTONES.md is de bron van waarheid voor planning

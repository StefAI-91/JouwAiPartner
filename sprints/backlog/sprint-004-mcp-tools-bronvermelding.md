# Micro Sprint 004: MCP Tools + Bronvermelding

## Doel

MCP tools updaten zodat het team via elke LLM-client vragen kan stellen over meetings en antwoorden krijgt met bronvermelding, confidence score en transcript quotes. Dit is de sprint die de kennisbasis bruikbaar maakt voor dagelijks gebruik.

## Requirements

| ID       | Beschrijving                                                                    |
| -------- | ------------------------------------------------------------------------------- |
| FUNC-020 | search_knowledge retourneert bronvermelding + confidence + transcript_ref       |
| FUNC-021 | get_decisions filtert extractions op type='decision' met bronvermelding         |
| FUNC-022 | get_action_items filtert op type='action_item' met metadata                     |
| FUNC-023 | get_meeting_summary retourneert meeting detail met alle velden                  |
| FUNC-024 | get_organization_overview retourneert compleet klantoverzicht via SQL joins     |
| FUNC-025 | list_meetings filtert meetings op organization, project, datum, type            |
| MCP-001  | search_knowledge bevat bronvermelding (meeting titel, datum, transcript_ref)    |
| MCP-002  | search_knowledge bevat confidence score per resultaat                           |
| MCP-003  | get_decisions filtert extractions op type='decision'                            |
| MCP-004  | get_action_items filtert extractions op type='action_item' met metadata         |
| MCP-005  | get_meeting_summary bevat meeting_type, party_type, organization, extractions   |
| MCP-007  | get_organization_overview retourneert meetings, extracties, projecten, people    |
| MCP-008  | list_meetings filtert op organization, project, date_from, date_to, type        |
| MCP-006  | correct_extraction overschrijft content/metadata, zet corrected_by/corrected_at |
| RULE-002 | Bronvermelding verplicht bij elk MCP-antwoord                                   |

## Bronverwijzingen

- PRD: `docs/specs/meeting-processing-review.md` -> sectie 7 "MCP Output met Bronvermelding"
- PRD: `docs/specs/meeting-processing-review.md` -> sectie 7.3 "MCP tools"

## Context

### Huidige MCP tools

De MCP server heeft al tools, maar ze moeten aangepast worden voor:

1. De nieuwe `extractions` tabel (i.p.v. aparte decisions/action_items tabellen)
2. Bronvermelding bij elk resultaat
3. Confidence score meegeven
4. Nieuwe meeting-velden (meeting_type, party_type, organization)

### Gewenste output per tool

**search_knowledge:**

```
Resultaat: "We kiezen leverancier X voor de cloud-migratie"
Type: decision | Confidence: 0.87
Bron: "Discovery call Acme Corp" — 15 maart 2026
> "...Jan zei dat we dan definitief voor leverancier X gaan, tenzij het budget..."
```

**get_decisions:**

```
1. "We kiezen leverancier X" (confidence: 0.87)
   Gemaakt door: Jan de Vries | Datum: 15 maart 2026
   Bron: "Discovery call Acme Corp"
   > "...Jan zei dat we dan definitief voor leverancier X gaan..."
```

**get_action_items:**

```
1. "Offerte aanvragen bij leverancier X" (confidence: 0.92)
   Assignee: Pieter | Due: 22 maart 2026 | Status: open
   Bron: "Discovery call Acme Corp"
```

**get_meeting_summary:**

```
Meeting: "Discovery call Acme Corp"
Datum: 15 maart 2026 | Type: discovery | Party: client
Organisatie: Acme Corp
Deelnemers: Jan de Vries, Pieter Jansen

Extracties:
- 2 decisions, 3 action items, 1 need
[lijst met bronvermelding per extractie]
```

**get_organization_overview:**

```
Organisatie: Acme Corp (client, active)
Contactpersoon: Mohammed | Email: m@acme.nl

Projecten: 2
- HalalBox (in_progress)
- Acme Portal (discovery)

Meetings: 5 (laatste: 22 maart 2026)
1. "Discovery call Acme Corp" — 15 maart 2026 (discovery, client)
   → 2 decisions, 3 action items, 1 need
2. "Sprint review HalalBox" — 22 maart 2026 (review, client)
   → 1 decision, 2 action items

Extracties totaal: 12 decisions, 8 action items, 3 needs, 5 insights
[details per extractie met bronvermelding]
```

**list_meetings:**

```
Filters: organization=Acme Corp, date_from=2026-01-01
Resultaten: 5 meetings

1. "Sprint review HalalBox" — 22 maart 2026 | review | client
2. "Discovery call Acme Corp" — 15 maart 2026 | discovery | client
3. ...
```

### Query aanpassingen

De MCP tools queryen nu `decisions` en `action_items` tabellen. Dit moet worden aangepast naar de `extractions` tabel met filter op `type`.

- `get_decisions`: `SELECT * FROM extractions WHERE type = 'decision'`
- `get_action_items`: `SELECT * FROM extractions WHERE type = 'action_item'`
- `search_knowledge`: gebruikt `search_all_content()` die al over meetings + extractions zoekt

Elke query moet joinen met `meetings` voor bronvermelding (titel, datum).

**Nieuwe tools (directe SQL, geen vector search):**

- `get_organization_overview`: JOIN organizations → meetings (via organization_id) → extractions (via meeting_id) → projects (via meeting_projects). Geen AI, geen embedding — puur relationele queries.
- `list_meetings`: `SELECT FROM meetings WHERE` met optionele filters op organization_id, project_id (via meeting_projects), date range, meeting_type, party_type. Pagination via `LIMIT/OFFSET` of cursor.

## Prerequisites

- Sprint 001 (database) is afgerond
- Sprint 003 (Extractor + pipeline) is afgerond
- Er staan meetings + extractions in de database

## Taken

- [ ] `search_knowledge` tool aanpassen: query naar extractions tabel, bronvermelding + confidence meegeven
- [ ] `get_decisions` tool aanpassen: filter type='decision', join meetings voor bron, metadata meegeven
- [ ] `get_action_items` tool aanpassen: filter type='action_item', assignee/due_date/status uit metadata
- [ ] `get_meeting_summary` tool aanpassen: meeting_type, party_type, organization, extracties meegeven
- [ ] `get_organization_overview` tool bouwen: JOIN organizations → meetings → extractions → projects, gesorteerd op datum, geen vector search
- [ ] `list_meetings` tool bouwen: SQL filters op organization, project, date_from, date_to, meeting_type, party_type, met pagination (limit/offset)
- [ ] `correct_extraction` tool bouwen: overschrijf content/metadata, zet corrected_by (auth user) + corrected_at, embedding_stale=true
- [ ] Alle tools: toon verificatie-status (AI + confidence of "geverifieerd door [naam]") bij elke extractie
- [ ] Tool descriptions updaten zodat LLM-clients weten wat ze kunnen verwachten
- [ ] Test: via MCP client vragen stellen en verifieer bronvermelding + confidence in antwoord
- [ ] Test: corrigeer een extractie via correct_extraction en verifieer dat correctie zichtbaar is bij volgende query

## Acceptatiecriteria

- [ ] [MCP-001..002] search_knowledge retourneert resultaten met meeting titel, datum, transcript quote en confidence
- [ ] [MCP-003] get_decisions retourneert alleen type='decision' extracties met made_by, date, context uit metadata
- [ ] [MCP-004] get_action_items retourneert alleen type='action_item' met assignee, due_date, status uit metadata
- [ ] [MCP-005] get_meeting_summary bevat meeting_type, party_type, organization_name en alle extracties
- [ ] [MCP-006] correct_extraction overschrijft content/metadata en zet corrected_by/corrected_at
- [ ] [RULE-002] Elk MCP-antwoord bevat bronvermelding — geen antwoord zonder bron
- [ ] Gecorrigeerde extracties tonen "geverifieerd door [naam]" i.p.v. confidence score
- [ ] Handmatige test: vraag via MCP "wat is er besloten over project X?" → antwoord met bron + confidence
- [ ] Handmatige test: corrigeer een extractie → bij volgende query toont het "geverifieerd door [naam]"
- [ ] [MCP-007] get_organization_overview retourneert meetings, extracties, projecten en people voor een organisatie
- [ ] [MCP-008] list_meetings filtert correct op organization, project, datum en type
- [ ] Handmatige test: "geef me alles over klant X" → get_organization_overview levert compleet overzicht
- [ ] Handmatige test: "wanneer spraken we klant Y laatst?" → list_meetings levert gesorteerde lijst

## Geraakt door deze sprint

- `src/lib/mcp/tools/search-knowledge.ts` (query + output aanpassen)
- `src/lib/mcp/tools/get-decisions.ts` (query naar extractions, bronvermelding)
- `src/lib/mcp/tools/get-action-items.ts` (query naar extractions, metadata)
- `src/lib/mcp/tools/get-meeting-summary.ts` (nieuwe velden)
- `src/lib/mcp/tools/get-organization-overview.ts` (nieuw — SQL joins, geen vector search)
- `src/lib/mcp/tools/list-meetings.ts` (nieuw — SQL filters met pagination)
- `src/lib/mcp/tools/correct-extraction.ts` (nieuw)

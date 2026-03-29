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
| MCP-001  | search_knowledge bevat bronvermelding (meeting titel, datum, transcript_ref)    |
| MCP-002  | search_knowledge bevat confidence score per resultaat                           |
| MCP-003  | get_decisions filtert extractions op type='decision'                            |
| MCP-004  | get_action_items filtert extractions op type='action_item' met metadata         |
| MCP-005  | get_meeting_summary bevat meeting_type, party_type, organization, extractions   |
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

### Query aanpassingen

De MCP tools queryen nu `decisions` en `action_items` tabellen. Dit moet worden aangepast naar de `extractions` tabel met filter op `type`.

- `get_decisions`: `SELECT * FROM extractions WHERE type = 'decision'`
- `get_action_items`: `SELECT * FROM extractions WHERE type = 'action_item'`
- `search_knowledge`: gebruikt `search_all_content()` die al over meetings + extractions zoekt

Elke query moet joinen met `meetings` voor bronvermelding (titel, datum).

## Prerequisites

- Sprint 001 (database) is afgerond
- Sprint 003 (Extractor + pipeline) is afgerond
- Er staan meetings + extractions in de database

## Taken

- [ ] `search_knowledge` tool aanpassen: query naar extractions tabel, bronvermelding + confidence meegeven
- [ ] `get_decisions` tool aanpassen: filter type='decision', join meetings voor bron, metadata meegeven
- [ ] `get_action_items` tool aanpassen: filter type='action_item', assignee/due_date/status uit metadata
- [ ] `get_meeting_summary` tool aanpassen: meeting_type, party_type, organization, extracties meegeven
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

## Geraakt door deze sprint

- `src/lib/mcp/tools/search-knowledge.ts` (query + output aanpassen)
- `src/lib/mcp/tools/get-decisions.ts` (query naar extractions, bronvermelding)
- `src/lib/mcp/tools/get-action-items.ts` (query naar extractions, metadata)
- `src/lib/mcp/tools/get-meeting-summary.ts` (nieuwe velden)
- `src/lib/mcp/tools/correct-extraction.ts` (nieuw)

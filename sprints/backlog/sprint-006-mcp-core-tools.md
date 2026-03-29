# Sprint 006: MCP core tools + bronvermelding

**Fase:** 2 — Dagelijks bruikbaar
**Doel:** Alle kerntoepassingen werken via MCP met bronvermelding en confidence scores.

## Requirements

FUNC-020..023, MCP-001..005, RULE-002

## Scope

1. `search_knowledge` uitbreiden: bronvermelding (meeting titel, datum, transcript_ref) + confidence + verificatie-status
2. `get_decisions`: filter extractions type='decision', join meetings voor bron, made_by/date/context uit metadata
3. `get_action_items`: filter type='action_item', assignee/due_date/status uit metadata, join meetings voor bron
4. `get_meeting_summary`: meeting detail met meeting_type, party_type, organization, deelnemers, alle extracties met bronvermelding
5. Elk antwoord toont "AI (confidence: 0.87)" of "geverifieerd door [naam]"

## Taken

- [ ] search_knowledge uitbreiden met bronvermelding + confidence
- [ ] get_decisions tool bouwen
- [ ] get_action_items tool bouwen
- [ ] get_meeting_summary tool bouwen
- [ ] Verificatie-status logica (AI confidence vs corrected_by)
- [ ] Testen via MCP client

## Testbaar

- "Wat is er besloten over project X?" → antwoord met meeting titel, datum, transcript quote, confidence
- "Welke actiepunten staan er open?" → lijst met assignee, deadline, bron
- "Vat meeting Y samen" → compleet overzicht met alle extracties

## Geraakt

- `src/lib/mcp/tools/search-knowledge.ts` (uitbreiden)
- `src/lib/mcp/tools/get-decisions.ts` (nieuw)
- `src/lib/mcp/tools/get-action-items.ts` (nieuw)
- `src/lib/mcp/tools/get-meeting-summary.ts` (nieuw)

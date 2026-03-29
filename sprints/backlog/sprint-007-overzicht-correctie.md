# Sprint 007: Overzicht-tools + correctie

**Fase:** 2 — Dagelijks bruikbaar
**Doel:** Organisatie-overzichten, meeting-filtering en extractie-correcties. v1 is compleet.

## Requirements

FUNC-024, FUNC-029..030, MCP-006..008

## Scope

1. `get_organization_overview`: JOIN organizations → meetings → extractions → projects → people. Puur SQL, geen vector search.
2. `list_meetings`: filters op organization, project, date_from, date_to, meeting_type, party_type. Pagination (limit/offset).
3. `correct_extraction`: content/metadata overschrijven, corrected_by (auth user) + corrected_at zetten, embedding_stale=true
4. Tool descriptions updaten zodat LLM-clients weten wat ze kunnen verwachten

## Taken

- [ ] get_organization_overview tool bouwen (SQL joins)
- [ ] list_meetings tool bouwen (SQL filters + pagination)
- [ ] correct_extraction tool bouwen
- [ ] Tool descriptions updaten
- [ ] Testen: overzicht, filtering, correctie

## Testbaar

- "Geef me alles over klant X" → compleet overzicht met meetings, extracties, projecten
- "Wanneer spraken we klant Y laatst?" → gesorteerde lijst meetings
- Correctie van extractie → bij volgende query zichtbaar als "geverifieerd door [naam]"
- Gecorrigeerde extractie krijgt embedding_stale=true → wordt hergeembed

## Demo-moment (Fase 2 compleet — v1 klaar)

Laat het team los op de MCP tools met realistische vragen. Alles met bronvermelding. v1 is compleet.

## Geraakt

- `src/lib/mcp/tools/get-organization-overview.ts` (nieuw)
- `src/lib/mcp/tools/list-meetings.ts` (nieuw)
- `src/lib/mcp/tools/correct-extraction.ts` (nieuw)

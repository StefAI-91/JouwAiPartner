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
5. Usage tracking: tabel `mcp_queries` (tool TEXT, user_id UUID, query TEXT, timestamp TIMESTAMPTZ). INSERT bij elke MCP tool call. Geen dashboard — `SELECT count(*) GROUP BY tool` in SQL is genoeg.

## Taken

- [x] get_organization_overview tool bouwen (SQL joins)
- [x] list_meetings tool bouwen (SQL filters + pagination)
- [x] correct_extraction tool bouwen
- [x] `mcp_queries` tabel + INSERT bij elke tool call (usage tracking)
- [x] Tool descriptions updaten
- [ ] Testen: overzicht, filtering, correctie
- [ ] Golden questions doorlopen — finale check voor v1 launch

## Testbaar

- "Geef me alles over klant X" → compleet overzicht met meetings, extracties, projecten
- "Wanneer spraken we klant Y laatst?" → gesorteerde lijst meetings
- Correctie van extractie → bij volgende query zichtbaar als "geverifieerd door [naam]"
- Gecorrigeerde extractie krijgt embedding_stale=true → wordt hergeembed
- `SELECT tool, count(*) FROM mcp_queries GROUP BY tool` → toont welke tools gebruikt worden

## Demo-moment (Fase 2 compleet — v1 klaar)

Laat het team los op de MCP tools met realistische vragen. Alles met bronvermelding. v1 is compleet.

## v1 Launch checklist

- [ ] Golden questions doorlopen — alle 10 correct beantwoord met bronvermelding
- [ ] Usage tracking werkt — queries worden gelogd
- [ ] Sufficiency check werkt — "ik weet het niet" bij ontbrekende data
- [ ] 1 week adoptie-experiment: team stelt dagelijks 1 vraag via Claude/MCP
- [ ] Na 1 week: `SELECT count(*) FROM mcp_queries` → wordt het gebruikt?

## Geraakt

- `src/lib/mcp/tools/get-organization-overview.ts` (nieuw)
- `src/lib/mcp/tools/list-meetings.ts` (nieuw)
- `src/lib/mcp/tools/correct-extraction.ts` (nieuw)
- `supabase/migrations/` (mcp_queries tabel)

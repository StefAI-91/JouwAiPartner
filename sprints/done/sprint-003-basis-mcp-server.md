# Sprint 003: MCP tools aanpassen voor nieuw schema

**Fase:** 0 — Walking Skeleton
**Doel:** Bestaande MCP server + tools laten werken met het nieuwe schema. Via Claude een vraag stellen → antwoord uit de database.

## Requirements

FUNC-020 (basis), MCP-001 (basis)

## Bestaande code

De MCP server en tools bestaan al:
- `src/lib/mcp/server.ts` — MCP server setup
- `src/lib/mcp/tools/search.ts` — search_knowledge (queryt nu oude tabellen)
- `src/lib/mcp/tools/decisions.ts` — queryt oude `decisions` tabel
- `src/lib/mcp/tools/meetings.ts` — queryt oude meetings schema
- `src/lib/mcp/tools/actions.ts` — queryt oude `action_items` tabel
- `src/lib/mcp/tools/pending.ts` — pending matches (niet meer nodig)

## Scope

1. `search.ts` aanpassen: gebruik vernieuwde `search_all_content()` (1024-dim, hybrid search)
2. `meetings.ts` aanpassen: nieuwe kolommen (meeting_type, party_type, organization)
3. `decisions.ts` aanpassen: query `extractions WHERE type='decision'` i.p.v. oude `decisions` tabel
4. `actions.ts` aanpassen: query `extractions WHERE type='action_item'` i.p.v. oude `action_items` tabel
5. `pending.ts` verwijderen (pending_matches tabel bestaat niet meer)
6. Embedding in search: Cohere (`inputType: "search_query"`) i.p.v. OpenAI
7. Testen met Claude client

## Taken

- [x] search.ts: query aanpassen voor nieuw schema + Cohere embedding (sprint 2)
- [x] meetings.ts: nieuwe kolommen meegeven (meeting_type, party_type, organization, extractions)
- [x] decisions.ts: query extractions WHERE type='decision'
- [x] actions.ts: query extractions WHERE type='action_item'
- [x] pending.ts: verwijderen
- [ ] Testen met Claude client (handmatige test data)

## Testbaar

- Via Claude/MCP: "wat weten we over [project uit seed data]?" → antwoord met meeting titel en datum
- search_knowledge retourneert resultaten uit meetings + extractions
- get_decisions filtert correct op extractions type

## Demo-moment (Fase 0 compleet)

Laat aan het team zien: "Ik stel een vraag via Claude en krijg een antwoord uit onze eigen database." Data is nog handmatig/seed, maar de keten werkt.

## Geraakt

- `src/lib/mcp/tools/search.ts` (aanpassen)
- `src/lib/mcp/tools/meetings.ts` (aanpassen)
- `src/lib/mcp/tools/decisions.ts` (aanpassen)
- `src/lib/mcp/tools/actions.ts` (aanpassen)
- `src/lib/mcp/tools/pending.ts` (verwijderen)

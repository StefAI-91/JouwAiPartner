# Sprint 003: Basis MCP server + search_knowledge

**Fase:** 0 — Walking Skeleton
**Doel:** Via Claude/MCP een vraag stellen en een antwoord krijgen uit de database.

## Requirements

FUNC-020 (basis), MCP-001 (basis)

## Scope

1. MCP server setup (TypeScript/Node.js, MCP SDK)
2. `search_knowledge` tool: embed query via Cohere (`inputType: "search_query"`) → `search_all_content()` → resultaten met meeting titel en datum
3. System prompt voor kennisbasis-context
4. Verbinding testen met Claude client

## Taken

- [ ] MCP server project opzetten
- [ ] `search_knowledge` tool implementeren
- [ ] System prompt schrijven
- [ ] Testen met Claude client (handmatig ingevoerde meeting + seed data)

## Testbaar

- Via Claude/MCP: "wat weten we over [project uit seed data]?" → antwoord met meeting titel en datum
- search_knowledge retourneert resultaten met basisinformatie

## Demo-moment (Fase 0 compleet)

Laat aan het team zien: "Ik stel een vraag via Claude en krijg een antwoord uit onze eigen database." Data is nog handmatig, maar de keten werkt.

## Geraakt

- MCP server bestanden (nieuw)
- `src/lib/mcp/tools/search-knowledge.ts` (nieuw)

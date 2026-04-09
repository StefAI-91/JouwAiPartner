# Micro Sprint 019: MCP Server en Tool Registratie Tests

## Doel

Schrijf tests die verifiereren dat de MCP server correct wordt opgebouwd en dat alle tools geregistreerd zijn. Test de MCP server constructie en tool registratie zonder externe database calls — focus op de structuur en configuratie. De individuele tool functies hoeven niet end-to-end getest te worden (die gebruiken dezelfde database queries/mutations die al in sprint 018 getest zijn via Server Actions), maar de server moet correct opgebouwd worden.

## Requirements

| ID       | Beschrijving                                           |
| -------- | ------------------------------------------------------ |
| TEST-068 | Test createMcpServer: server registreert alle 10 tools |

## Bronverwijzingen

- MCP server: `packages/mcp/src/server.ts` (regels 1-63) — createMcpServer() registreert 10 tools en 1 prompt
- MCP tools:
  - `packages/mcp/src/tools/search.ts` — registerSearchTools (search_knowledge)
  - `packages/mcp/src/tools/meetings.ts` — registerMeetingTools (get_meeting_details)
  - `packages/mcp/src/tools/actions.ts` — registerActionTools (get_tasks, get_action_items)
  - `packages/mcp/src/tools/decisions.ts` — registerDecisionTools (get_decisions)
  - `packages/mcp/src/tools/organizations.ts` — registerOrganizationTools (get_organizations)
  - `packages/mcp/src/tools/projects.ts` — registerProjectTools (get_projects)
  - `packages/mcp/src/tools/people.ts` — registerPeopleTools (get_people)
  - `packages/mcp/src/tools/get-organization-overview.ts` — registerOrganizationOverviewTools (get_organization_overview)
  - `packages/mcp/src/tools/list-meetings.ts` — registerListMeetingsTools (list_meetings)
  - `packages/mcp/src/tools/correct-extraction.ts` — registerCorrectExtractionTools (correct_extraction)

## Context

### MCP Server structuur

De `createMcpServer()` functie maakt een `McpServer` instantie en registreert 10 tools via aparte register-functies:

```typescript
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "jouwaipartner-knowledge",
    version: "1.0.0",
    description: "JouwAIPartner kennisbasis — organisaties, projecten, mensen, meetings, besluiten, actiepunten",
  });

  registerSearchTools(server);
  registerMeetingTools(server);
  registerActionTools(server);
  registerDecisionTools(server);
  registerOrganizationTools(server);
  registerProjectTools(server);
  registerPeopleTools(server);
  registerOrganizationOverviewTools(server);
  registerListMeetingsTools(server);
  registerCorrectExtractionTools(server);

  server.prompt("kennisbasis-context", ...);
  return server;
}
```

### Test aanpak

De MCP SDK's `McpServer` klasse heeft een `.tool()` methode die tools registreert. Na registratie kan de server worden geïnspecteerd om te verifiereren dat alle verwachte tools aanwezig zijn.

**Mock strategie:** De register-functies roepen `server.tool()` aan, wat geen database calls doet (alleen registratie). Maar sommige register-functies importeren database modules die side-effects hebben (bijv. `getAdminClient()`). Mock `@repo/database/supabase/admin` en `@repo/ai/embeddings` zodat imports niet falen.

### Verwachte tool namen

De server moet precies deze 11 tools registreren (get_tasks en get_action_items zitten in dezelfde register-functie):

1. `search_knowledge`
2. `get_meeting_details`
3. `get_tasks`
4. `get_action_items`
5. `get_decisions`
6. `get_organizations`
7. `get_projects`
8. `get_people`
9. `get_organization_overview`
10. `list_meetings`
11. `correct_extraction`

En 1 prompt:

1. `kennisbasis-context`

## Prerequisites

- [ ] Micro Sprint 015: Testframework Setup moet afgerond zijn

## Taken

- [ ] **Schrijf MCP server constructie test:** Maak `packages/mcp/__tests__/server.test.ts`. Test dat `createMcpServer()` een McpServer retourneert zonder errors. Mock `@repo/database/supabase/admin` en `@repo/ai/embeddings` zodat imports niet falen door ontbrekende env vars.

- [ ] **Schrijf MCP tool registratie test:** In hetzelfde testbestand, verifieer dat alle 11 verwachte tools geregistreerd zijn na het aanroepen van `createMcpServer()`. Gebruik de McpServer API om de geregistreerde tools op te vragen en check dat elke verwachte tool naam aanwezig is.

- [ ] **Schrijf MCP server metadata test:** Verifieer dat de server de juiste naam ("jouwaipartner-knowledge"), versie ("1.0.0") en beschrijving heeft.

## Acceptatiecriteria

- [ ] TEST-068: `createMcpServer()` registreert alle 11 tools (search_knowledge, get_meeting_details, get_tasks, get_action_items, get_decisions, get_organizations, get_projects, get_people, get_organization_overview, list_meetings, correct_extraction)
- [ ] Server metadata (naam, versie) is correct
- [ ] Test draait zonder echte database connectie (alle external imports gemocked)
- [ ] `npm run test` slaagt inclusief alle eerdere tests

## Geraakt door deze sprint

- `packages/mcp/__tests__/server.test.ts` (nieuw)

# @repo/mcp

MCP (Model Context Protocol) server die Claude (en andere MCP-clients) toegang geeft tot de kennisbasis van Jouw AI Partner: organisaties, projecten, mensen, meetings, actiepunten, decisions. Wordt geserveerd via cockpit's `/api/mcp`-route (Streamable HTTP transport, OAuth 2.1).

## Wanneer gebruiken

- Claude Code / Claude Desktop koppelen aan de kennisbasis → via MCP client-config wijzen naar deze server.
- Nieuwe MCP-tool toevoegen → in `src/tools/` + registreren in `server.ts`.
- Corrigeren of bekijken van extracties via Claude → bestaande tools (`correct_extraction`, `get_meeting_summary`, etc.).

**Niet hierin:** UI, Server Actions, agent-logica (dat is `@repo/ai`). MCP is puur een read/write-interface naar de DB.

## Publieke exports

### `@repo/mcp/server`

- `createMcpServer()` — bouwt een `McpServer` instance met alle 10 tools + system prompt `kennisbasis-context` geregistreerd.

### Tools (`@repo/mcp/tools/*`)

Elke tool-file exporteert een `register*Tools(server)` functie:

| Tool-category | Bestand                                                                  | MCP-tools                                                                        |
| ------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Search        | `search.ts`                                                              | `search_knowledge` (vector + filters op verified)                                |
| Meetings      | `meetings.ts`, `list-meetings.ts`                                        | `get_meeting_summary`, `list_meetings`                                           |
| Actions       | `actions.ts`                                                             | `get_action_items`                                                               |
| Decisions     | `decisions.ts`                                                           | `get_decisions`                                                                  |
| Organizations | `organizations.ts`, `get-organization-overview.ts`                       | `get_organizations`, `get_organization_overview`                                 |
| Projects      | `projects.ts`                                                            | `get_projects`                                                                   |
| People        | `people.ts`                                                              | `get_people`                                                                     |
| Write         | `write-tasks.ts`, `write-client-updates.ts`, `write-client-questions.ts` | `create_task`, `log_client_update`, `ask_client_question`, `complete_task`, etc. |
| Correcties    | `correct-extraction.ts`                                                  | `correct_extraction` (review-flow integration)                                   |
| Intern        | `utils.ts`, `usage-tracking.ts`                                          | helpers, geen tools                                                              |

Zie `packages/mcp/src/tools/utils.ts` voor gedeelde auth-check + client-scope.

## Regels

- **Verified-only by default.** Alle read-tools filteren standaard op `verification_status = 'approved'`; optional flag `include_drafts` om reviewers toe te laten. Zie sprint-014 (MCP verification filter).
- **Write-tools vereisen expliciete context.** `create_task` moet altijd een source-meeting of source-extraction hebben. `log_client_update` schrijft naar `client_updates`. `ask_client_question` vereist `asked_by_name` (zelfde patroon als `create_task` met `created_by_name`); de tool weigert profielen met client-rol als defense-in-depth boven RLS.
- **Geen directe `.from()`-calls.** Alle DB-access via `@repo/database/queries/*` of `@repo/database/mutations/*`. Check `npm run check:queries`.
- **Test-uitzondering `_registeredTools`.** MCP SDK 1.28 biedt geen publieke `listTools()` — tests mogen `_registeredTools` en `_registeredPrompts` lezen met JSDoc-markering. Zie `docs/specs/test-strategy.md §4`.

## MCP-config (Claude Desktop & Claude Code)

De server is **geen stdio-process**. Hij wordt geserveerd via de cockpit als
HTTP endpoint op `/api/mcp` (`apps/cockpit/src/app/api/mcp/route.ts`,
Streamable HTTP transport) met OAuth 2.1 Bearer-auth voor remote MCP-clients.
Claude Desktop en Claude Code koppelen dus aan een URL, niet aan een lokale
binary.

**Identity voor `ask_client_question`** komt uit de tool-call zelf
(`asked_by_name`-parameter), niet uit een env-var: één productie-deploy =
één env-vars-set, dus een env-var-afzender wordt voor alle devs gelijk
— precies wat we niet wilden. Geef daarom je naam mee in de tool-call,
de tool resolved naar je profiel-id via `findProfileIdByName`.

**Server-side env-vars** (Vercel deploy van cockpit):

- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — al gezet voor de web-apps,
  dezelfde admin-client wordt door MCP-tools gebruikt.
- `NEXT_PUBLIC_PORTAL_URL` — al gezet; de tool gebruikt hem voor de
  portal-deeplink in de output.

Geen extra env-vars nodig om `ask_client_question` aan te zetten.

## Ontwikkeling

```bash
npm test --workspace=@repo/mcp         # alle tests
npm run type-check --workspace=@repo/mcp
```

Tests staan in `packages/mcp/__tests__/`. Boundary-mock: `@repo/database` + `@modelcontextprotocol/sdk`. Zie sprint T06 (MCP tools tests, done).

## Afhankelijkheden

- Intern: `@repo/database`, `@repo/ai` (embeddings voor `search_knowledge`)
- Extern: `@modelcontextprotocol/sdk`, `zod`

## Gerelateerde sprints

- 003 (basis MCP server), 006 (core tools), 014 (verification filter), 025 (segment search), 026 (feedback loop), T06 (tests).

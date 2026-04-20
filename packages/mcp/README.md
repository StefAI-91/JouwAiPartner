# @repo/mcp

MCP (Model Context Protocol) server die Claude (en andere MCP-clients) toegang geeft tot de kennisbasis van Jouw AI Partner: organisaties, projecten, mensen, meetings, actiepunten, decisions. Draait als standalone process naast de web-apps.

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

| Tool-category | Bestand                                            | MCP-tools                                                 |
| ------------- | -------------------------------------------------- | --------------------------------------------------------- |
| Search        | `search.ts`                                        | `search_knowledge` (vector + filters op verified)         |
| Meetings      | `meetings.ts`, `list-meetings.ts`                  | `get_meeting_summary`, `list_meetings`                    |
| Actions       | `actions.ts`                                       | `get_action_items`                                        |
| Decisions     | `decisions.ts`                                     | `get_decisions`                                           |
| Organizations | `organizations.ts`, `get-organization-overview.ts` | `get_organizations`, `get_organization_overview`          |
| Projects      | `projects.ts`                                      | `get_projects`                                            |
| People        | `people.ts`                                        | `get_people`                                              |
| Write         | `write-tasks.ts`, `write-client-updates.ts`        | `create_task`, `log_client_update`, `complete_task`, etc. |
| Correcties    | `correct-extraction.ts`                            | `correct_extraction` (review-flow integration)            |
| Intern        | `utils.ts`, `usage-tracking.ts`                    | helpers, geen tools                                       |

Zie `packages/mcp/src/tools/utils.ts` voor gedeelde auth-check + client-scope.

## Regels

- **Verified-only by default.** Alle read-tools filteren standaard op `verification_status = 'approved'`; optional flag `include_drafts` om reviewers toe te laten. Zie sprint-014 (MCP verification filter).
- **Write-tools vereisen expliciete context.** `create_task` moet altijd een source-meeting of source-extraction hebben. `log_client_update` schrijft naar `client_updates`.
- **Geen directe `.from()`-calls.** Alle DB-access via `@repo/database/queries/*` of `@repo/database/mutations/*`. Check `npm run check:queries`.
- **Test-uitzondering `_registeredTools`.** MCP SDK 1.28 biedt geen publieke `listTools()` — tests mogen `_registeredTools` en `_registeredPrompts` lezen met JSDoc-markering. Zie `docs/specs/test-strategy.md §4`.

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

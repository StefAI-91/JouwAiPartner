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
- **Write-tools vereisen expliciete context.** `create_task` moet altijd een source-meeting of source-extraction hebben. `log_client_update` schrijft naar `client_updates`. `ask_client_question` vereist een team-profiel via `MCP_SENDER_PROFILE_ID` (per dev).
- **Geen directe `.from()`-calls.** Alle DB-access via `@repo/database/queries/*` of `@repo/database/mutations/*`. Check `npm run check:queries`.
- **Test-uitzondering `_registeredTools`.** MCP SDK 1.28 biedt geen publieke `listTools()` — tests mogen `_registeredTools` en `_registeredPrompts` lezen met JSDoc-markering. Zie `docs/specs/test-strategy.md §4`.

## MCP-config (Claude Desktop & Claude Code)

De server draait als stdio-process en wordt door de MCP-client opgestart.
Beide clients lezen dezelfde server-config; alleen de plek waar je hem
neerzet verschilt.

**Vereiste env-vars (zie `docs/ops/deployment.md` §MCP env vars):**

- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — admin-client (alle tools).
- `MCP_SENDER_PROFILE_ID` — UUID van het team-profiel dat als afzender geldt
  voor `ask_client_question`. **Per dev een ander profiel** zodat de portal
  laat zien wie de vraag stelde. Lookup: in cockpit → `/admin/team` → ID
  kopiëren bij je eigen rij.
- `NEXT_PUBLIC_PORTAL_URL` — base-URL voor deeplinks in de tool-output.

### Claude Desktop

Voeg een `jouwaipartner-knowledge`-entry toe aan
`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) of
`%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "jouwaipartner-knowledge": {
      "command": "tsx",
      "args": ["/absolute/path/to/JouwAiPartner/packages/mcp/src/index.ts"],
      "env": {
        "SUPABASE_URL": "https://<project>.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "<service-role-key>",
        "MCP_SENDER_PROFILE_ID": "<jouw-profile-uuid>",
        "NEXT_PUBLIC_PORTAL_URL": "https://jouw-ai-partner-portal.vercel.app"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add jouwaipartner-knowledge \
  --command tsx \
  --args /absolute/path/to/JouwAiPartner/packages/mcp/src/index.ts \
  --env SUPABASE_URL=https://<project>.supabase.co \
  --env SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
  --env MCP_SENDER_PROFILE_ID=<jouw-profile-uuid> \
  --env NEXT_PUBLIC_PORTAL_URL=https://jouw-ai-partner-portal.vercel.app
```

Verifieer met `claude mcp list`. De tool `ask_client_question` is daarna
beschikbaar in beide clients.

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

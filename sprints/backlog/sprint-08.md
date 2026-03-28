# Sprint 08: MCP Server

**Phase:** V1 — Data Pipeline
**Requirements:** REQ-105, REQ-1200, REQ-1203, REQ-1209, REQ-1210
**Depends on:** Sprint 02 (search functions), Sprint 03 (embedding utility)
**Produces:** MCP server that any LLM client (Claude Code, Claude Desktop) can connect to for querying the knowledge base. Implements all v1 tools from the PRD.

---

## Task 1: Scaffold MCP server

**What:** Set up a standalone TypeScript MCP server using the official SDK. Separate process from the Next.js app.

**Project structure:**

```
knowledge-platform/
  mcp-server/
    src/
      index.ts          # server entry point
      tools/
        search.ts       # search_knowledge tool
        meetings.ts     # get_meeting_summary tool
        actions.ts      # get_action_items tool
        decisions.ts    # get_decisions tool
        pending.ts      # get_pending_matches tool
        health.ts       # system_health tool (Sprint 09)
      lib/
        supabase.ts     # shared Supabase client
        embeddings.ts   # shared embedding utility
    package.json
    tsconfig.json
```

**`mcp-server/package.json`:**

```json
{
  "name": "knowledge-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "openai": "^4.0.0",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

**`mcp-server/src/index.ts`:**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSearchTools } from "./tools/search.js";
import { registerMeetingTools } from "./tools/meetings.js";
import { registerActionTools } from "./tools/actions.js";
import { registerDecisionTools } from "./tools/decisions.js";
import { registerPendingTools } from "./tools/pending.js";

const server = new McpServer({
  name: "jouwaipartner-knowledge",
  version: "1.0.0",
  description: "JouwAIPartner kennisbasis — meeting transcripts, besluiten, actiepunten",
});

// Register all v1 tools
registerSearchTools(server);
registerMeetingTools(server);
registerActionTools(server);
registerDecisionTools(server);
registerPendingTools(server);

// Connect via stdio transport (Claude communicates over stdin/stdout)
const transport = new StdioServerTransport();
await server.connect(transport);
```

**`mcp-server/tsconfig.json`:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

**`mcp-server/src/lib/supabase.ts`:**

```typescript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
```

**`mcp-server/src/lib/embeddings.ts`:**

```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedQuery(query: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
    dimensions: 1536,
  });
  return response.data[0].embedding;
}
```

---

## Task 2: Implement v1 tools from the PRD

**What:** Five tools as defined in PRD section 5:

1. `search_knowledge(query)` — semantic search across all content
2. `get_meeting_summary(meeting_id)` — specific meeting details
3. `get_action_items(assignee?, status?, project?)` — filtered action items
4. `get_decisions(project?, date_range?)` — filtered decisions
5. `get_pending_matches()` — view and assign unmatched entities

### Tool 1: `search_knowledge`

**`mcp-server/src/tools/search.ts`:**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { embedQuery } from "../lib/embeddings.js";

export function registerSearchTools(server: McpServer) {
  server.tool(
    "search_knowledge",
    "Semantisch zoeken over alle content in de kennisbasis. Gebruik voor vragen over bedrijfskennis, besluiten, projecten, mensen of meetings.",
    {
      query: z.string().describe("The search query in natural language"),
      limit: z.number().optional().default(10).describe("Max results to return (default 10)"),
    },
    async ({ query, limit }) => {
      const queryEmbedding = await embedQuery(query);

      const { data: results, error } = await supabase.rpc("search_all_content", {
        query_embedding: queryEmbedding,
        match_threshold: 0.75,
        match_count: limit,
      });

      if (error) {
        return {
          content: [{ type: "text" as const, text: `Search error: ${error.message}` }],
        };
      }

      if (!results || results.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Geen relevante resultaten gevonden in de kennisbasis.",
            },
          ],
        };
      }

      const formatted = results.map((r: any, i: number) => {
        return [
          `### Result ${i + 1} (${r.source_table}, similarity: ${r.similarity.toFixed(3)})`,
          r.title ? `**Title:** ${r.title}` : null,
          `**Content:** ${r.content.slice(0, 500)}${r.content.length > 500 ? "..." : ""}`,
          `**Source ID:** ${r.id}`,
        ]
          .filter(Boolean)
          .join("\n");
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${results.length} results:\n\n${formatted.join("\n\n---\n\n")}`,
          },
        ],
      };
    },
  );
}
```

### Tool 2: `get_meeting_summary`

**`mcp-server/src/tools/meetings.ts`:**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

export function registerMeetingTools(server: McpServer) {
  server.tool(
    "get_meeting_summary",
    "Haal de volledige samenvatting, actiepunten en deelnemers op voor een specifieke meeting. Gebruik het meeting ID uit zoekresultaten, of zoek op titel.",
    {
      meeting_id: z.string().optional().describe("UUID of the meeting (from search results)"),
      title_search: z.string().optional().describe("Search meetings by title (partial match)"),
    },
    async ({ meeting_id, title_search }) => {
      let query = supabase
        .from("meetings")
        .select(
          "id, title, date, participants, summary, transcript, category, relevance_score, project_id",
        );

      if (meeting_id) {
        query = query.eq("id", meeting_id);
      } else if (title_search) {
        query = query.ilike("title", `%${title_search}%`);
      } else {
        return {
          content: [
            {
              type: "text" as const,
              text: "Geef een meeting_id of title_search op.",
            },
          ],
        };
      }

      const { data: meetings, error } = await query.eq("status", "active").limit(5);

      if (error || !meetings || meetings.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: meeting_id
                ? `Meeting ${meeting_id} niet gevonden.`
                : `Geen meetings gevonden voor "${title_search}".`,
            },
          ],
        };
      }

      // Also fetch related decisions and action items
      const formatted = await Promise.all(
        meetings.map(async (m: any) => {
          const { data: decisions } = await supabase
            .from("decisions")
            .select("decision, made_by")
            .eq("source_id", m.id);

          const { data: actionItems } = await supabase
            .from("action_items")
            .select("description, assignee, due_date, scope, status")
            .eq("source_id", m.id);

          return [
            `## ${m.title}`,
            `**Datum:** ${m.date ? new Date(m.date).toLocaleDateString("nl-NL") : "Onbekend"}`,
            `**Deelnemers:** ${m.participants?.join(", ") || "Onbekend"}`,
            `**Categorieen:** ${m.category?.join(", ") || "Niet gecategoriseerd"}`,
            `**Relevantie:** ${m.relevance_score?.toFixed(2) || "N/A"}`,
            "",
            `### Samenvatting`,
            m.summary || "Geen samenvatting beschikbaar.",
            "",
            `### Besluiten`,
            decisions && decisions.length > 0
              ? decisions
                  .map(
                    (d: any, i: number) =>
                      `${i + 1}. ${d.decision} (door: ${d.made_by || "onbekend"})`,
                  )
                  .join("\n")
              : "Geen besluiten vastgelegd.",
            "",
            `### Actiepunten`,
            actionItems && actionItems.length > 0
              ? actionItems
                  .map(
                    (a: any, i: number) =>
                      `${i + 1}. ${a.description} — ${a.assignee || "niemand"} ${a.due_date ? `(deadline: ${a.due_date})` : ""} [${a.status}]`,
                  )
                  .join("\n")
              : "Geen actiepunten vastgelegd.",
            "",
            `**Meeting ID:** ${m.id}`,
          ].join("\n");
        }),
      );

      return {
        content: [
          {
            type: "text" as const,
            text: formatted.join("\n\n---\n\n"),
          },
        ],
      };
    },
  );
}
```

### Tool 3: `get_action_items`

**`mcp-server/src/tools/actions.ts`:**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

export function registerActionTools(server: McpServer) {
  server.tool(
    "get_action_items",
    "Haal actiepunten op, optioneel gefilterd op eigenaar, status of project.",
    {
      assignee: z.string().optional().describe("Filter by assignee name (partial match)"),
      status: z.enum(["open", "in_progress", "done"]).optional().describe("Filter by status"),
      project: z.string().optional().describe("Filter by project name"),
    },
    async ({ assignee, status, project }) => {
      let query = supabase
        .from("action_items")
        .select(
          `
          id, description, assignee, due_date, scope, status,
          source_type, source_id, project_id,
          projects:project_id (name)
        `,
        )
        .order("due_date", { ascending: true, nullsFirst: false });

      if (assignee) {
        query = query.ilike("assignee", `%${assignee}%`);
      }
      if (status) {
        query = query.eq("status", status);
      }
      if (project) {
        // Join through projects table
        query = query.not("project_id", "is", null);
      }

      const { data: items, error } = await query.limit(50);

      if (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      }

      if (!items || items.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Geen actiepunten gevonden met deze filters.",
            },
          ],
        };
      }

      // Filter by project name client-side if needed
      let filtered = items;
      if (project) {
        filtered = items.filter((item: any) =>
          item.projects?.name?.toLowerCase().includes(project.toLowerCase()),
        );
      }

      const formatted = filtered.map((item: any, i: number) => {
        const projectName = item.projects?.name || "geen project";
        const deadline = item.due_date || "geen deadline";
        return `${i + 1}. **${item.description}**\n   Eigenaar: ${item.assignee || "niemand"} | Deadline: ${deadline} | Status: ${item.status} | Scope: ${item.scope} | Project: ${projectName}`;
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `${filtered.length} actiepunten gevonden:\n\n${formatted.join("\n\n")}`,
          },
        ],
      };
    },
  );
}
```

### Tool 4: `get_decisions`

**`mcp-server/src/tools/decisions.ts`:**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

export function registerDecisionTools(server: McpServer) {
  server.tool(
    "get_decisions",
    "Haal besluiten op, optioneel gefilterd op project of datumbereik.",
    {
      project: z.string().optional().describe("Filter by project name"),
      date_from: z.string().optional().describe("Start date (ISO format, e.g. 2026-03-01)"),
      date_to: z.string().optional().describe("End date (ISO format, e.g. 2026-03-31)"),
    },
    async ({ project, date_from, date_to }) => {
      let query = supabase
        .from("decisions")
        .select(
          `
          id, decision, context, made_by, date, status,
          source_type, source_id, project_id,
          projects:project_id (name)
        `,
        )
        .eq("status", "active")
        .order("date", { ascending: false });

      if (date_from) {
        query = query.gte("date", date_from);
      }
      if (date_to) {
        query = query.lte("date", date_to);
      }

      const { data: decisions, error } = await query.limit(50);

      if (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      }

      if (!decisions || decisions.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Geen besluiten gevonden met deze filters.",
            },
          ],
        };
      }

      // Filter by project name client-side if needed
      let filtered = decisions;
      if (project) {
        filtered = decisions.filter((d: any) =>
          d.projects?.name?.toLowerCase().includes(project.toLowerCase()),
        );
      }

      const formatted = filtered.map((d: any, i: number) => {
        const projectName = d.projects?.name || "geen project";
        const dateStr = d.date ? new Date(d.date).toLocaleDateString("nl-NL") : "onbekende datum";
        return `${i + 1}. **${d.decision}**\n   Door: ${d.made_by || "onbekend"} | Datum: ${dateStr} | Project: ${projectName}\n   Bron: ${d.source_type} (${d.source_id})`;
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `${filtered.length} besluiten gevonden:\n\n${formatted.join("\n\n")}`,
          },
        ],
      };
    },
  );
}
```

### Tool 5: `get_pending_matches` (NEW)

**`mcp-server/src/tools/pending.ts`:**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

export function registerPendingTools(server: McpServer) {
  server.tool(
    "get_pending_matches",
    "Bekijk ongematchte entiteiten die wachten op koppeling aan een project. Gebruik dit om te zien welke namen niet automatisch gekoppeld konden worden.",
    {},
    async () => {
      const { data: pendingMatches, error } = await supabase
        .from("pending_matches")
        .select(
          `
          id, content_id, content_table, extracted_name,
          suggested_match_id, similarity_score, status, created_at
        `,
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      }

      if (!pendingMatches || pendingMatches.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Geen ongematchte items. Alle entiteiten zijn gekoppeld.",
            },
          ],
        };
      }

      // Group by extracted name
      const grouped = new Map<string, typeof pendingMatches>();
      for (const match of pendingMatches) {
        const existing = grouped.get(match.extracted_name) || [];
        existing.push(match);
        grouped.set(match.extracted_name, existing);
      }

      const lines: string[] = [];
      let index = 1;

      for (const [name, matches] of grouped) {
        const count = matches.length;
        const tables = [...new Set(matches.map((m) => m.content_table))].join(", ");
        const dateStr = new Date(matches[0].created_at).toLocaleDateString("nl-NL");

        let line = `${index}. **"${name}"** — ${count}x gevonden in: ${tables} (sinds: ${dateStr})`;

        // Show suggested match if available
        const withSuggestion = matches.find((m) => m.suggested_match_id);
        if (withSuggestion) {
          // Fetch the suggested project name
          const { data: suggestedProject } = await supabase
            .from("projects")
            .select("name")
            .eq("id", withSuggestion.suggested_match_id)
            .single();

          if (suggestedProject) {
            line += `\n   Mogelijke match: "${suggestedProject.name}" (similarity: ${withSuggestion.similarity_score?.toFixed(2) || "N/A"})`;
          }
        }

        lines.push(line);
        index++;
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `${pendingMatches.length} ongematchte items:\n\n${lines.join("\n\n")}`,
          },
        ],
      };
    },
  );
}
```

---

## Task 3: MCP system prompt

**What:** The MCP server provides a system prompt that tells the LLM how to interpret the knowledge base. Copied from PRD section 5.

**Add to `mcp-server/src/index.ts` (as a resource or prompt):**

```typescript
// Register the system prompt as an MCP prompt
server.prompt(
  "kennisbasis-context",
  "System prompt voor het gebruik van de JouwAIPartner kennisbasis",
  async () => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Je hebt toegang tot de JouwAIPartner kennisbasis via MCP.
Deze bevat meeting transcripts, besluiten, en actiepunten.

Bij het beantwoorden van vragen:
- Verwijs altijd naar de bron (meeting datum, deelnemers)
- Als je meerdere relevante meetings vindt, geef de meest recente
- Bij actiepunten, vermeld altijd de eigenaar en deadline
- Bij besluiten, vermeld wie het besluit nam en wanneer
- Als je het antwoord niet vindt, zeg dat eerlijk`,
        },
      },
    ],
  }),
);
```

**Configure Claude Code to use the MCP server. Add to Claude Code settings:**

```json
{
  "mcpServers": {
    "jouwaipartner-knowledge": {
      "command": "node",
      "args": ["C:/path/to/knowledge-platform/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "OPENAI_API_KEY": "your-openai-key"
      }
    }
  }
}
```

Build and test:

```bash
cd mcp-server
npm install
npm run build
```

---

## Verification

- [ ] `npm run build` compiles without errors
- [ ] MCP server starts via `npm start` (waits for stdio input)
- [ ] Claude Code connects to the MCP server and lists all 5 tools
- [ ] `search_knowledge("project status")` returns results from the knowledge base
- [ ] `get_meeting_summary(title_search: "standup")` returns matching meetings with decisions and action items
- [ ] `get_action_items(status: "open")` returns open action items
- [ ] `get_action_items(assignee: "Stef")` filters by assignee
- [ ] `get_decisions(project: "HalalBox")` returns project-specific decisions
- [ ] `get_pending_matches()` returns unmatched entities with suggested matches
- [ ] Empty queries return Dutch "geen resultaten" messages (not errors)
- [ ] System prompt is available as an MCP prompt

# Sprint 08: MCP Server (Core)

**Phase:** 1 — Foundation
**Requirements:** REQ-105, REQ-1200, REQ-1203, REQ-1209, REQ-1210
**Depends on:** Sprint 02 (search functions), Sprint 03 (embedding utility)
**Produces:** MCP server that Claude Code can connect to for knowledge queries

---

## Task 1: Scaffold MCP server

**What:** Set up a standalone TypeScript MCP server using the official SDK.

**Project structure:**
```
knowledge-platform/
  mcp-server/
    src/
      index.ts          # server entry point
      tools/
        search.ts       # search_knowledge tool
        meetings.ts     # get_meeting_summary tool
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

const server = new McpServer({
  name: "company-knowledge",
  version: "1.0.0",
});

// Register all tools
registerSearchTools(server);
registerMeetingTools(server);

// Connect via stdio transport (Claude Code communicates over stdin/stdout)
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
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

---

## Task 2: Implement `search_knowledge` tool

**What:** Semantic search across all content tables. Embeds the query, runs vector similarity, returns ranked results with source citations.

**`mcp-server/src/tools/search.ts`:**
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function embedQuery(query: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
    dimensions: 1536,
  });
  return response.data[0].embedding;
}

export function registerSearchTools(server: McpServer) {
  server.tool(
    "search_knowledge",
    "Search the company knowledge base using semantic similarity. Use this for any question about company knowledge, decisions, projects, people, or meetings.",
    {
      query: z.string().describe("The search query in natural language"),
      limit: z.number().optional().default(10).describe("Max results to return (default 10)"),
      source_filter: z
        .enum(["all", "documents", "meetings", "slack_messages", "emails"])
        .optional()
        .default("all")
        .describe("Filter by source type"),
    },
    async ({ query, limit, source_filter }) => {
      // Embed the query
      const queryEmbedding = await embedQuery(query);

      // Run vector similarity search
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

      // Filter by source if specified
      const filtered = source_filter === "all"
        ? results
        : results.filter((r: any) => r.source_table === source_filter);

      if (!filtered || filtered.length === 0) {
        return {
          content: [{
            type: "text" as const,
            text: "No relevant results found in the knowledge base.",
          }],
        };
      }

      // Format results with source citations
      const formatted = filtered.map((r: any, i: number) => {
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
        content: [{
          type: "text" as const,
          text: `Found ${filtered.length} results:\n\n${formatted.join("\n\n---\n\n")}`,
        }],
      };
    }
  );
}
```

**Key details:**
- Tool description is important — it tells the LLM WHEN to use this tool
- Results are truncated to 500 chars per item to avoid overwhelming the LLM context
- Source citations include the table and ID for traceability
- Threshold 0.75 is slightly lower than the DB default (0.78) to cast a wider net

---

## Task 3: Implement `get_meeting_summary` tool

**What:** Retrieve a specific meeting by ID or search meetings by title/date.

**`mcp-server/src/tools/meetings.ts`:**
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

export function registerMeetingTools(server: McpServer) {
  server.tool(
    "get_meeting_summary",
    "Get the full summary, action items, and participants for a specific meeting. Use the meeting ID from search results, or search by title.",
    {
      meeting_id: z.string().optional().describe("UUID of the meeting (from search results)"),
      title_search: z.string().optional().describe("Search meetings by title (partial match)"),
    },
    async ({ meeting_id, title_search }) => {
      let query = supabase
        .from("meetings")
        .select("id, title, date, participants, summary, action_items, category, relevance_score");

      if (meeting_id) {
        query = query.eq("id", meeting_id);
      } else if (title_search) {
        query = query.ilike("title", `%${title_search}%`);
      } else {
        return {
          content: [{
            type: "text" as const,
            text: "Please provide either a meeting_id or title_search.",
          }],
        };
      }

      const { data: meetings, error } = await query.eq("status", "active").limit(5);

      if (error || !meetings || meetings.length === 0) {
        return {
          content: [{
            type: "text" as const,
            text: meeting_id
              ? `Meeting ${meeting_id} not found.`
              : `No meetings found matching "${title_search}".`,
          }],
        };
      }

      const formatted = meetings.map((m: any) => {
        return [
          `## ${m.title}`,
          `**Date:** ${new Date(m.date).toLocaleDateString()}`,
          `**Participants:** ${m.participants?.join(", ") || "Unknown"}`,
          `**Categories:** ${m.category?.join(", ") || "Uncategorized"}`,
          `**Relevance Score:** ${m.relevance_score?.toFixed(2) || "N/A"}`,
          "",
          `### Summary`,
          m.summary || "No summary available.",
          "",
          `### Action Items`,
          Array.isArray(m.action_items)
            ? m.action_items.map((a: string, i: number) => `${i + 1}. ${a}`).join("\n")
            : "No action items recorded.",
          "",
          `**Meeting ID:** ${m.id}`,
        ].join("\n");
      });

      return {
        content: [{
          type: "text" as const,
          text: formatted.join("\n\n---\n\n"),
        }],
      };
    }
  );
}
```

**Configure Claude Code to use the MCP server. Add to Claude Code settings (`claude_desktop_config.json` or `.claude/settings.json`):**
```json
{
  "mcpServers": {
    "company-knowledge": {
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
- [ ] Claude Code connects to the MCP server and lists the two tools
- [ ] `search_knowledge("project status")` returns results from the knowledge base
- [ ] `get_meeting_summary(title_search: "standup")` returns matching meetings
- [ ] Results include source citations (table, ID, similarity score)
- [ ] Empty queries return "No results found" message (not an error)

# Sprint 22: Analyst Agent

**Phase:** 3 — Insights & Delivery
**Requirements:** REQ-800–REQ-806
**Depends on:** Sprint 15 (Curator pattern established), Sprint 02 (insights table)
**Produces:** Daily insight generation agent using Claude Opus

---

## Task 1: Set up Analyst agent with Claude Agent SDK

**What:** Multi-step agent using Claude Opus that searches the knowledge base, correlates patterns, and writes insight cards.

**Create `src/lib/agents/analyst.ts`:**
```typescript
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { embedText } from "../embeddings";

const anthropic = new Anthropic();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ANALYST_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_recent_content",
    description: "Search content ingested in the last N days. Returns semantically relevant results.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string" },
        days: { type: "number", description: "Look back N days" },
        limit: { type: "number" },
      },
      required: ["query", "days"],
    },
  },
  {
    name: "get_recent_decisions",
    description: "Get all decisions made in the last N days.",
    input_schema: {
      type: "object" as const,
      properties: { days: { type: "number" } },
      required: ["days"],
    },
  },
  {
    name: "get_open_action_items",
    description: "Get all open action items, optionally overdue only.",
    input_schema: {
      type: "object" as const,
      properties: { overdue_only: { type: "boolean" } },
      required: [],
    },
  },
  {
    name: "get_topic_frequency",
    description: "Count how many times a topic appears across recent content.",
    input_schema: {
      type: "object" as const,
      properties: {
        topic: { type: "string" },
        days: { type: "number" },
      },
      required: ["topic", "days"],
    },
  },
  {
    name: "write_insight",
    description: "Write an insight card to the database.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Short insight title" },
        body: { type: "string", description: "Detailed insight with evidence" },
        topic: { type: "string" },
        supporting_sources: {
          type: "array",
          items: {
            type: "object",
            properties: {
              source_type: { type: "string" },
              source_id: { type: "string" },
            },
          },
        },
      },
      required: ["title", "body", "topic"],
    },
  },
];

// Tool implementations
async function executeTool(name: string, input: any): Promise<string> {
  switch (name) {
    case "search_recent_content": {
      const embedding = await embedText(input.query);
      const since = new Date(Date.now() - (input.days || 7) * 86400000).toISOString();
      const { data } = await supabase.rpc("search_all_content", {
        query_embedding: embedding,
        match_threshold: 0.70,
        match_count: input.limit || 15,
      });
      // Filter to recent only
      const recent = (data || []).filter((d: any) => d.created_at > since);
      return JSON.stringify(recent.map((d: any) => ({
        id: d.id, source: d.source_table, title: d.title,
        content: d.content?.slice(0, 300), similarity: d.similarity,
      })));
    }
    case "get_recent_decisions": {
      const since = new Date(Date.now() - (input.days || 7) * 86400000).toISOString();
      const { data } = await supabase.from("decisions").select("*")
        .gte("date", since).order("date", { ascending: false });
      return JSON.stringify(data || []);
    }
    case "get_open_action_items": {
      let query = supabase.from("action_items").select("*").eq("status", "open");
      if (input.overdue_only) query = query.lt("due_date", new Date().toISOString());
      const { data } = await query;
      return JSON.stringify(data || []);
    }
    case "get_topic_frequency": {
      const since = new Date(Date.now() - (input.days || 7) * 86400000).toISOString();
      const embedding = await embedText(input.topic);
      const { data } = await supabase.rpc("search_all_content", {
        query_embedding: embedding, match_threshold: 0.80, match_count: 50,
      });
      return JSON.stringify({ topic: input.topic, mentions: data?.length || 0 });
    }
    case "write_insight": {
      await supabase.from("insights").insert({
        title: input.title,
        body: input.body,
        topic: input.topic,
        supporting_sources: input.supporting_sources || [],
        dispatched: false,
      });
      return JSON.stringify({ saved: true });
    }
    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}
```

---

## Task 2: Analyst agent loop and prompt

**What:** The Analyst runs a multi-turn conversation with Opus to discover insights.

```typescript
const ANALYST_PROMPT = `You are the Analyst agent for a company knowledge platform. Your job is to find non-obvious patterns, risks, and opportunities in the company's accumulated knowledge.

Today's date: ${new Date().toISOString().split("T")[0]}

Run this analysis:
1. Search for recurring topics in the last 7 days. What themes keep coming up?
2. Check for overdue action items. Flag any that are more than a week overdue.
3. Look for contradictions: decisions that conflict with each other.
4. Look for risks: topics mentioned in 3+ sources that suggest a problem (client churn, project delays, team issues).
5. Look for opportunities: positive patterns or things going well that should be amplified.

For each genuine insight, write it using the write_insight tool. Only write insights that are:
- Non-obvious (not something everyone already knows)
- Actionable (someone can do something about it)
- Supported by evidence (cite the specific sources)

Do NOT write trivial insights like "the team had meetings this week." Focus on patterns across sources.`;

export async function runAnalyst(): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: ANALYST_PROMPT },
  ];

  while (true) {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-20250514",
      max_tokens: 8192,
      tools: ANALYST_TOOLS,
      messages,
    });

    if (response.stop_reason === "end_turn") {
      return response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as Anthropic.TextBlock).text)
        .join("\n");
    }

    messages.push({ role: "assistant", content: response.content });
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const result = await executeTool(block.name, block.input);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }
}
```

---

## Task 3: Schedule daily + Curator-triggered runs

**API route `src/app/api/agents/analyst/route.ts`:**
```typescript
import { runAnalyst } from "@/lib/agents/analyst";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.AGENT_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const report = await runAnalyst();
  return NextResponse.json({ report });
}
```

**Schedule daily at 5 AM (after Curator at 2 AM):**
```sql
SELECT cron.schedule(
    'daily-analyst',
    '0 5 * * *',
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT.supabase.co/functions/v1/run-analyst',
        headers := jsonb_build_object('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'),
        body := '{}'::jsonb
    );
    $$
);
```

**Curator trigger:** At the end of the Curator run, if contradictions or significant merges were found, trigger the Analyst:
```typescript
// In Curator's generate_report tool implementation:
if (input.contradictions_found > 0) {
  await fetch(`${process.env.APP_URL}/api/agents/analyst`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.AGENT_SECRET}` },
  });
}
```

---

## Verification

- [ ] Analyst agent loop runs with Claude Opus
- [ ] Agent searches recent content, decisions, and action items
- [ ] Overdue action items are flagged
- [ ] Non-trivial insights are written to `insights` table with supporting sources
- [ ] Daily cron job triggers at 5 AM
- [ ] Curator contradictions trigger an Analyst run
- [ ] Insights include evidence (source IDs) and are actionable

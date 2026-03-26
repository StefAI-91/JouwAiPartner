# Sprint 15: Curator Agent

**Phase:** 2 — Expand Sources & Agents
**Requirements:** REQ-108, REQ-700, REQ-701, REQ-702, REQ-703, REQ-705, REQ-708, REQ-709
**Depends on:** Sprint 02 (all tables), Sprint 03 (embedding utility)
**Produces:** Nightly database hygiene agent that merges duplicates, flags stale content, validates sources

---

## Task 1: Set up Curator agent with Claude Agent SDK

**What:** Multi-step agent using Claude Sonnet that performs several hygiene checks per run. Uses the agentic loop pattern with tool use.

**Create `src/lib/agents/curator.ts`:**
```typescript
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define Curator tools — the agent uses these to query and act on the database
const CURATOR_TOOLS: Anthropic.Tool[] = [
  {
    name: "find_similar_entries",
    description: "Find content entries with embedding similarity above a threshold. Used for duplicate detection.",
    input_schema: {
      type: "object" as const,
      properties: {
        table: { type: "string", enum: ["documents", "meetings", "slack_messages", "emails"] },
        threshold: { type: "number", description: "Similarity threshold (0.0-1.0). Use 0.90 for duplicates." },
        limit: { type: "number", description: "Max pairs to return" },
      },
      required: ["table", "threshold"],
    },
  },
  {
    name: "find_stale_content",
    description: "Find content that hasn't been referenced or reviewed in a long time.",
    input_schema: {
      type: "object" as const,
      properties: {
        table: { type: "string" },
        days_threshold: { type: "number", description: "Content older than this many days without review" },
      },
      required: ["table", "days_threshold"],
    },
  },
  {
    name: "merge_entries",
    description: "Merge two duplicate entries. Keeps the more complete one, archives the other.",
    input_schema: {
      type: "object" as const,
      properties: {
        table: { type: "string" },
        keep_id: { type: "string", description: "UUID of the entry to keep" },
        archive_id: { type: "string", description: "UUID of the entry to archive" },
        reason: { type: "string" },
      },
      required: ["table", "keep_id", "archive_id", "reason"],
    },
  },
  {
    name: "flag_stale",
    description: "Flag content as stale for review.",
    input_schema: {
      type: "object" as const,
      properties: {
        table: { type: "string" },
        id: { type: "string" },
        reason: { type: "string" },
      },
      required: ["table", "id", "reason"],
    },
  },
  {
    name: "generate_report",
    description: "Generate the final health report for this Curator run.",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: { type: "string" },
        duplicates_merged: { type: "number" },
        stale_flagged: { type: "number" },
        sources_invalid: { type: "number" },
      },
      required: ["summary", "duplicates_merged", "stale_flagged", "sources_invalid"],
    },
  },
];

// Tool implementations
async function executeTool(name: string, input: any): Promise<string> {
  switch (name) {
    case "find_similar_entries": {
      // Find pairs of entries with high similarity
      const { data } = await supabase
        .from(input.table)
        .select("id, title, content, embedding")
        .eq("status", "active")
        .not("embedding", "is", null)
        .limit(100);

      if (!data || data.length < 2) return JSON.stringify({ pairs: [] });

      // Compare embeddings pairwise (simplified — in production, use a SQL function)
      const pairs: any[] = [];
      for (let i = 0; i < data.length && pairs.length < (input.limit || 10); i++) {
        for (let j = i + 1; j < data.length && pairs.length < (input.limit || 10); j++) {
          const similarity = cosineSimilarity(data[i].embedding, data[j].embedding);
          if (similarity > input.threshold) {
            pairs.push({
              entry_a: { id: data[i].id, title: data[i].title, content: data[i].content?.slice(0, 200) },
              entry_b: { id: data[j].id, title: data[j].title, content: data[j].content?.slice(0, 200) },
              similarity: similarity.toFixed(4),
            });
          }
        }
      }
      return JSON.stringify({ pairs });
    }

    case "find_stale_content": {
      const cutoff = new Date(Date.now() - input.days_threshold * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from(input.table)
        .select("id, title, created_at, last_reviewed")
        .eq("status", "active")
        .lt("created_at", cutoff)
        .is("last_reviewed", null)
        .limit(20);
      return JSON.stringify({ stale_entries: data || [] });
    }

    case "merge_entries": {
      await supabase.from(input.table).update({ status: "archived" }).eq("id", input.archive_id);
      await supabase.from(input.table).update({
        last_reviewed: new Date().toISOString(),
        embedding_stale: true,
      }).eq("id", input.keep_id);
      await supabase.from("content_reviews").insert({
        content_id: input.archive_id,
        content_table: input.table,
        agent_role: "curator",
        action: "merged",
        reason: input.reason,
      });
      return JSON.stringify({ success: true });
    }

    case "flag_stale": {
      await supabase.from(input.table).update({
        review_notes: input.reason,
        last_reviewed: new Date().toISOString(),
      }).eq("id", input.id);
      await supabase.from("content_reviews").insert({
        content_id: input.id,
        content_table: input.table,
        agent_role: "curator",
        action: "flagged_stale",
        reason: input.reason,
      });
      return JSON.stringify({ success: true });
    }

    case "generate_report": {
      await supabase.from("content_reviews").insert({
        content_id: "00000000-0000-0000-0000-000000000000",
        content_table: "system",
        agent_role: "curator",
        action: "health_report",
        reason: input.summary,
        metadata: {
          duplicates_merged: input.duplicates_merged,
          stale_flagged: input.stale_flagged,
          sources_invalid: input.sources_invalid,
        },
      });
      return JSON.stringify({ report_saved: true });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

---

## Task 2: Implement the agent loop

**What:** The Curator runs as a multi-turn conversation with Claude Sonnet, using tools to inspect and clean the database.

```typescript
const CURATOR_SYSTEM_PROMPT = `You are the Curator agent for a company knowledge platform. Your job is to maintain database quality through nightly hygiene checks.

Run these checks in order:
1. DUPLICATE SWEEP: Use find_similar_entries on each content table with threshold 0.90. For each pair, decide which entry to keep (prefer the more complete/recent one) and merge.
2. STALENESS CHECK: Use find_stale_content to find entries older than 90 days that have never been reviewed. Flag them for review.
3. SOURCE VALIDATION: Note any entries where source_exists should be checked (this will be automated later).
4. GENERATE REPORT: Summarize what you found and did.

Be conservative — only merge entries that are clearly duplicates. When in doubt, flag for human review rather than merging.`;

export async function runCurator(): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: "Run the nightly database hygiene checks. Process all content tables: documents, meetings, slack_messages, emails.",
    },
  ];

  let finalReport = "";

  // Agent loop — keep going until the model stops calling tools
  while (true) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: CURATOR_SYSTEM_PROMPT,
      tools: CURATOR_TOOLS,
      messages,
    });

    // If the model is done (no tool use), extract final text
    if (response.stop_reason === "end_turn") {
      finalReport = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as Anthropic.TextBlock).text)
        .join("\n");
      break;
    }

    // Process tool calls
    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const result = await executeTool(block.name, block.input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  return finalReport;
}
```

---

## Task 3: Schedule nightly run via pg_cron

**What:** Create an Edge Function wrapper and schedule it to run at 2 AM daily.

**Create `supabase/functions/run-curator/index.ts`:**
```typescript
Deno.serve(async (req) => {
  // Call the Curator API route in the Next.js app
  // Or implement the Curator directly in this Edge Function
  const response = await fetch(
    `${Deno.env.get("APP_URL")}/api/agents/curator`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("AGENT_SECRET")}` },
    }
  );

  const result = await response.json();
  return new Response(JSON.stringify(result));
});
```

**Next.js API route (`src/app/api/agents/curator/route.ts`):**
```typescript
import { runCurator } from "@/lib/agents/curator";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Verify internal auth
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.AGENT_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await runCurator();
  return NextResponse.json({ report });
}
```

**Schedule:**
```sql
SELECT cron.schedule(
    'nightly-curator',
    '0 2 * * *',    -- 2:00 AM daily
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT.supabase.co/functions/v1/run-curator',
        headers := jsonb_build_object(
            'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
            'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
);
```

---

## Verification

- [ ] Curator agent loop runs: calls tools, processes results, continues until done
- [ ] Duplicate entries (similarity > 0.90) are detected and merged
- [ ] Stale entries (>90 days, no review) are flagged
- [ ] All actions logged to `content_reviews` with agent_role='curator'
- [ ] Health report generated and stored
- [ ] pg_cron job runs at 2 AM: `SELECT * FROM cron.job WHERE jobname = 'nightly-curator';`
- [ ] Merged entries have status='archived', surviving entry has `embedding_stale=true`

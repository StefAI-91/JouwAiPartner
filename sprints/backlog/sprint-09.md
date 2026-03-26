# Sprint 09: Metrics + End-to-End Test

**Phase:** 1 — Foundation
**Requirements:** REQ-1800, REQ-1801, REQ-1802
**Depends on:** All previous sprints (this validates the full pipeline)
**Produces:** Basic metrics tracking + confirmed working end-to-end pipeline

---

## Task 1: Create metrics tracking table and functions

**What:** Lightweight metrics table to track query volume, Gatekeeper rates, and zero-match rate.

```sql
CREATE TABLE metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,        -- 'mcp_query', 'gatekeeper_decision', 'search_zero_match'
    metric_value JSONB NOT NULL,      -- flexible payload per metric type
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_metrics_name_date ON metrics(metric_name, created_at);
```

**Add to MCP server `search_knowledge` tool (track queries + zero matches):**
```typescript
// At the start of the search handler:
await supabase.from("metrics").insert({
  metric_name: "mcp_query",
  metric_value: { tool: "search_knowledge", query },
});

// After getting results, if empty:
if (!filtered || filtered.length === 0) {
  await supabase.from("metrics").insert({
    metric_name: "search_zero_match",
    metric_value: { tool: "search_knowledge", query },
  });
}
```

**Add to Gatekeeper pipeline (track decisions):**
```typescript
// In logGatekeeperDecision():
await supabase.from("metrics").insert({
  metric_name: "gatekeeper_decision",
  metric_value: {
    action: result.action,
    source: contentTable,
    relevance_score: result.relevance_score,
  },
});
```

**SQL views for quick metric queries:**
```sql
-- Query volume per day
CREATE VIEW daily_query_volume AS
SELECT
    DATE(created_at) AS day,
    COUNT(*) AS query_count
FROM metrics
WHERE metric_name = 'mcp_query'
GROUP BY DATE(created_at)
ORDER BY day DESC;

-- Gatekeeper admit rate
CREATE VIEW gatekeeper_rates AS
SELECT
    DATE(created_at) AS day,
    COUNT(*) FILTER (WHERE metric_value->>'action' = 'admit') AS admitted,
    COUNT(*) FILTER (WHERE metric_value->>'action' = 'quarantine') AS quarantined,
    COUNT(*) FILTER (WHERE metric_value->>'action' = 'reject') AS rejected,
    COUNT(*) AS total
FROM metrics
WHERE metric_name = 'gatekeeper_decision'
GROUP BY DATE(created_at)
ORDER BY day DESC;

-- Zero-match rate
CREATE VIEW zero_match_rate AS
SELECT
    DATE(m1.created_at) AS day,
    COUNT(DISTINCT CASE WHEN m2.id IS NOT NULL THEN m2.id END) AS zero_matches,
    COUNT(DISTINCT m1.id) AS total_queries,
    ROUND(
        COUNT(DISTINCT CASE WHEN m2.id IS NOT NULL THEN m2.id END)::NUMERIC /
        NULLIF(COUNT(DISTINCT m1.id), 0) * 100, 1
    ) AS zero_match_pct
FROM metrics m1
LEFT JOIN metrics m2
    ON DATE(m1.created_at) = DATE(m2.created_at)
    AND m2.metric_name = 'search_zero_match'
WHERE m1.metric_name = 'mcp_query'
GROUP BY DATE(m1.created_at)
ORDER BY day DESC;
```

---

## Task 2: Add metrics to MCP server as a tool

**What:** Let Claude query the metrics directly via MCP for quick health checks.

**`mcp-server/src/tools/metrics.ts`:**
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

export function registerMetricsTools(server: McpServer) {
  server.tool(
    "get_system_health",
    "Get system health metrics: query volume, Gatekeeper admit rates, and zero-match rate. Use this to check if the knowledge platform is working correctly.",
    {
      days: z.number().optional().default(7).describe("Number of days to look back"),
    },
    async ({ days }) => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // Query volume
      const { data: queries } = await supabase
        .from("metrics")
        .select("id")
        .eq("metric_name", "mcp_query")
        .gte("created_at", since);

      // Gatekeeper decisions
      const { data: decisions } = await supabase
        .from("metrics")
        .select("metric_value")
        .eq("metric_name", "gatekeeper_decision")
        .gte("created_at", since);

      const admitted = decisions?.filter((d) => d.metric_value.action === "admit").length || 0;
      const quarantined = decisions?.filter((d) => d.metric_value.action === "quarantine").length || 0;
      const rejected = decisions?.filter((d) => d.metric_value.action === "reject").length || 0;
      const total = decisions?.length || 0;

      // Zero matches
      const { data: zeroMatches } = await supabase
        .from("metrics")
        .select("id")
        .eq("metric_name", "search_zero_match")
        .gte("created_at", since);

      const queryCount = queries?.length || 0;
      const zeroMatchCount = zeroMatches?.length || 0;

      const report = [
        `## System Health (last ${days} days)`,
        "",
        `### Query Volume`,
        `- Total queries: ${queryCount}`,
        `- Avg per day: ${(queryCount / days).toFixed(1)}`,
        "",
        `### Gatekeeper`,
        `- Total processed: ${total}`,
        `- Admitted: ${admitted} (${total ? ((admitted / total) * 100).toFixed(1) : 0}%)`,
        `- Quarantined: ${quarantined} (${total ? ((quarantined / total) * 100).toFixed(1) : 0}%)`,
        `- Rejected: ${rejected} (${total ? ((rejected / total) * 100).toFixed(1) : 0}%)`,
        "",
        `### Search Quality`,
        `- Zero-match searches: ${zeroMatchCount}/${queryCount} (${queryCount ? ((zeroMatchCount / queryCount) * 100).toFixed(1) : 0}%)`,
      ];

      return {
        content: [{ type: "text" as const, text: report.join("\n") }],
      };
    }
  );
}
```

Register in `index.ts`:
```typescript
import { registerMetricsTools } from "./tools/metrics.js";
registerMetricsTools(server);
```

---

## Task 3: End-to-end test

**What:** Verify the complete pipeline works: Fireflies webhook → Gatekeeper → extraction → DB → MCP query.

**Test script (`mcp-server/test/e2e.ts`):**
```typescript
/**
 * End-to-end test checklist — run manually:
 *
 * 1. INGESTION: Send a test webhook to the Fireflies endpoint
 *    curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/fireflies-webhook \
 *      -H "Content-Type: application/json" \
 *      -d '{"meetingId": "test-meeting-123", "eventType": "Transcription completed"}'
 *
 *    Expected: Meeting fetched from Fireflies, chunked, scored by Gatekeeper, inserted into DB.
 *
 * 2. GATEKEEPER: Check content_reviews table
 *    SELECT * FROM content_reviews ORDER BY created_at DESC LIMIT 5;
 *    Expected: An 'admitted' or 'quarantined' entry with reason and metadata.
 *
 * 3. EXTRACTION: Check people and decisions tables
 *    SELECT * FROM people ORDER BY created_at DESC LIMIT 5;
 *    SELECT * FROM decisions ORDER BY created_at DESC LIMIT 5;
 *    SELECT * FROM action_items ORDER BY created_at DESC LIMIT 5;
 *    Expected: People, skills, decisions, and action items extracted from the meeting.
 *
 * 4. EMBEDDING: Check that the meeting has an embedding
 *    SELECT id, title, embedding IS NOT NULL AS has_embedding, embedding_stale
 *    FROM meetings ORDER BY created_at DESC LIMIT 5;
 *    Expected: has_embedding = true, embedding_stale = false.
 *
 * 5. MCP QUERY: From Claude Code, ask:
 *    "What was discussed in the recent meeting?"
 *    Expected: Claude calls search_knowledge, gets the meeting content back.
 *
 * 6. METRICS: From Claude Code, ask:
 *    "How is the knowledge platform doing?"
 *    Expected: Claude calls get_system_health, shows query count and Gatekeeper rates.
 *
 * 7. IDEMPOTENCY: Send the same webhook again
 *    Expected: Duplicate detected, meeting not re-inserted.
 *
 * 8. POLLING FALLBACK: Trigger the polling function
 *    curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/fireflies-poll
 *    Expected: No new meetings processed (already ingested via webhook).
 */
```

**Key things to validate:**
| Step | Component | Expected Result |
|---|---|---|
| Webhook received | Edge Function | Returns 200, meeting fetched |
| Gatekeeper scores | Vercel AI SDK + Haiku | Score > 0.6 for business meeting |
| Content inserted | Supabase | Row in `meetings` with status='active' |
| Extraction runs | Vercel AI SDK + Haiku | People, decisions, action items created |
| Embedding generated | OpenAI API | 1536-dim vector stored, `embedding_stale=false` |
| MCP search works | MCP Server | Claude finds the meeting via `search_knowledge` |
| Metrics logged | metrics table | Query and Gatekeeper decision recorded |
| Duplicate rejected | Idempotency check | Second webhook call returns "duplicate" |

---

## Verification

- [ ] Full pipeline works end-to-end: webhook → Gatekeeper → extraction → DB → MCP query
- [ ] Metrics table has entries for `mcp_query` and `gatekeeper_decision`
- [ ] `get_system_health` MCP tool returns correct counts
- [ ] SQL views (`daily_query_volume`, `gatekeeper_rates`, `zero_match_rate`) return data
- [ ] Claude Code can answer "What was discussed in the meeting?" using the MCP server

**Phase 1 is complete when this sprint passes all checks.**

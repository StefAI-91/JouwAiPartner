# Sprint 09: E2E Test + Metrics

**Phase:** V1 — Data Pipeline
**Requirements:** REQ-106, REQ-1300
**Depends on:** All previous sprints (03-08)
**Produces:** Metrics tracking, end-to-end test checklist matching the PRD's 8-step flow, system health MCP tool. Phase 1 (v1) is complete when all checks pass.

---

## Task 1: Metrics table and tracking

**What:** Three metrics from the PRD's success criteria (section 9), tracked from day one:

| Metric                | What it tells             | How to measure             |
| --------------------- | ------------------------- | -------------------------- |
| Query volume          | Is it being used?         | MCP tool calls per day     |
| Gatekeeper admit rate | Is the filter well-tuned? | % pass vs reject           |
| Zero-match rate       | Are queries useful?       | % searches without results |

**Create metrics table:**

```sql
CREATE TABLE IF NOT EXISTS metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,       -- 'mcp_query', 'gatekeeper_decision', 'search_zero_match'
    metric_value JSONB NOT NULL,     -- flexible payload
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_name_date ON metrics(metric_name, created_at);
```

**Add tracking to the Gatekeeper pipeline (`src/lib/agents/gatekeeper-pipeline.ts`):**

```typescript
/**
 * Log a Gatekeeper decision metric.
 */
async function trackGatekeeperMetric(
  action: "pass" | "reject",
  relevanceScore: number,
): Promise<void> {
  await supabase.from("metrics").insert({
    metric_name: "gatekeeper_decision",
    metric_value: {
      action,
      relevance_score: relevanceScore,
    },
  });
}

// Call in processMeeting():
await trackGatekeeperMetric(result.action, result.relevance_score);
```

**Add tracking to the MCP search tool (`mcp-server/src/tools/search.ts`):**

```typescript
// After search completes, log the metric:
await supabase.from("metrics").insert({
  metric_name: "mcp_query",
  metric_value: {
    query,
    results_count: results?.length || 0,
    zero_match: !results || results.length === 0,
  },
});
```

**Metric query helpers (useful for monitoring):**

```sql
-- Gatekeeper admit rate (last 7 days)
SELECT
  (metric_value->>'action') AS action,
  COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percentage
FROM metrics
WHERE metric_name = 'gatekeeper_decision'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY metric_value->>'action';

-- MCP query volume (per day, last 30 days)
SELECT
  DATE(created_at) AS day,
  COUNT(*) AS queries
FROM metrics
WHERE metric_name = 'mcp_query'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY day DESC;

-- Zero-match rate (last 7 days)
SELECT
  COUNT(*) FILTER (WHERE (metric_value->>'zero_match')::boolean = true) AS zero_matches,
  COUNT(*) AS total,
  ROUND(
    COUNT(*) FILTER (WHERE (metric_value->>'zero_match')::boolean = true) * 100.0 / NULLIF(COUNT(*), 0),
    1
  ) AS zero_match_rate
FROM metrics
WHERE metric_name = 'mcp_query'
  AND created_at > NOW() - INTERVAL '7 days';
```

---

## Task 2: End-to-end test checklist (PRD's 8-step flow)

**What:** Verify the complete pipeline works by walking through the PRD's 8 steps with a real (or simulated) meeting.

### The Ultimate Test (from PRD section 9)

> Een teamlid vraagt: "Wat kwam er uit de meeting met [klant] vorige week?" — en krijgt binnen 5 seconden een correct, bronvermeld antwoord. Als dat werkt, is v1 geslaagd.

### Step-by-step E2E test:

**Step 1 — Fireflies webhook:**

```bash
# Simulate a Fireflies webhook (or use a real test meeting)
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/fireflies-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "meetingId": "test-meeting-001",
    "eventType": "Transcription completed"
  }'
```

- [ ] Webhook receives the payload and fetches the transcript

**Step 2 — Pre-filter:**

- [ ] Test-calls < 2 minutes are rejected (not sent to Gatekeeper)
- [ ] Meetings without participants are rejected
- [ ] Duplicate meeting_id is rejected

**Step 3 — Gatekeeper + Extraction:**

- [ ] Gatekeeper returns structured output with relevance_score, action, entities, decisions, action_items
- [ ] Score >= 0.6 → pass, score < 0.6 → reject
- [ ] No quarantine status exists anywhere

**Step 4 — Extraction output verified:**

- [ ] Decisions are extracted with `made_by`
- [ ] Action items are extracted with `assignee`, `deadline`, `scope`, `project`
- [ ] Entities include people, projects, clients, topics

**Step 5 — Entity resolution:**

- [ ] Known project names are matched (exact or alias)
- [ ] Unknown names create `pending_matches` entries
- [ ] High-similarity embedding matches auto-add aliases

**Step 6 — Data saved to Supabase:**

- [ ] Meeting row in `meetings` table with `project_id`
- [ ] Decisions in `decisions` table with `source_id` pointing to meeting
- [ ] Action items in `action_items` table with `scope` and `project_id`

**Step 7 — Embeddings generated:**

- [ ] Meeting has `embedding_stale = true` after insert
- [ ] Re-embed worker processes it within 10 minutes
- [ ] After re-embed: `embedding` is populated, `embedding_stale = false`

**Step 8 — Impact check:**

- [ ] New decision is compared against existing decisions
- [ ] If conflict detected: `update_suggestions` entry created
- [ ] Slack notification sent for conflicts

**MCP verification:**

- [ ] `search_knowledge("meeting with [client]")` returns the test meeting
- [ ] `get_meeting_summary(meeting_id)` returns full details with decisions and action items
- [ ] `get_action_items(assignee: "Stef")` returns action items from the meeting
- [ ] `get_decisions(project: "TestProject")` returns decisions
- [ ] `get_pending_matches()` shows any unresolved entities

---

## Task 3: System health MCP tool

**What:** An MCP tool that reports pipeline health metrics, useful for debugging and monitoring.

**Create `mcp-server/src/tools/health.ts`:**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

export function registerHealthTools(server: McpServer) {
  server.tool(
    "system_health",
    "Toon systeemgezondheid: pipeline metrics, stale embeddings, pending matches, recente activiteit.",
    {},
    async () => {
      // Count meetings
      const { count: meetingCount } = await supabase
        .from("meetings")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Count decisions
      const { count: decisionCount } = await supabase
        .from("decisions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Count open action items
      const { count: openActionItems } = await supabase
        .from("action_items")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");

      // Count pending matches
      const { count: pendingMatchCount } = await supabase
        .from("pending_matches")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Count stale embeddings
      const { count: staleMeetings } = await supabase
        .from("meetings")
        .select("*", { count: "exact", head: true })
        .eq("embedding_stale", true);

      const { count: staleDecisions } = await supabase
        .from("decisions")
        .select("*", { count: "exact", head: true })
        .eq("embedding_stale", true);

      // Count pending update suggestions
      const { count: pendingSuggestions } = await supabase
        .from("update_suggestions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Gatekeeper stats (last 7 days)
      const { data: gatekeeperStats } = await supabase
        .from("metrics")
        .select("metric_value")
        .eq("metric_name", "gatekeeper_decision")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const passCount =
        gatekeeperStats?.filter((m: any) => m.metric_value.action === "pass").length || 0;
      const rejectCount =
        gatekeeperStats?.filter((m: any) => m.metric_value.action === "reject").length || 0;
      const totalGatekeeper = passCount + rejectCount;
      const admitRate =
        totalGatekeeper > 0 ? ((passCount / totalGatekeeper) * 100).toFixed(1) : "N/A";

      // MCP query stats (last 7 days)
      const { data: queryStats } = await supabase
        .from("metrics")
        .select("metric_value")
        .eq("metric_name", "mcp_query")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const totalQueries = queryStats?.length || 0;
      const zeroMatches = queryStats?.filter((m: any) => m.metric_value.zero_match).length || 0;
      const zeroMatchRate =
        totalQueries > 0 ? ((zeroMatches / totalQueries) * 100).toFixed(1) : "N/A";

      const report = [
        `## Systeemgezondheid`,
        "",
        `### Content`,
        `- Meetings: ${meetingCount || 0}`,
        `- Besluiten: ${decisionCount || 0}`,
        `- Open actiepunten: ${openActionItems || 0}`,
        "",
        `### Pipeline status`,
        `- Stale embeddings: ${(staleMeetings || 0) + (staleDecisions || 0)} (meetings: ${staleMeetings || 0}, decisions: ${staleDecisions || 0})`,
        `- Pending matches: ${pendingMatchCount || 0}`,
        `- Pending update suggestions: ${pendingSuggestions || 0}`,
        "",
        `### Metrics (afgelopen 7 dagen)`,
        `- Gatekeeper: ${totalGatekeeper} verwerkt (${passCount} pass, ${rejectCount} reject, admit rate: ${admitRate}%)`,
        `- MCP queries: ${totalQueries} (zero-match rate: ${zeroMatchRate}%)`,
      ].join("\n");

      return {
        content: [{ type: "text" as const, text: report }],
      };
    },
  );
}
```

**Register in `mcp-server/src/index.ts`:**

```typescript
import { registerHealthTools } from "./tools/health.js";

// Add after other tool registrations:
registerHealthTools(server);
```

---

## Phase 1 Complete Checklist

V1 is complete when ALL of the following are true:

- [ ] Fireflies webhook receives and processes meetings
- [ ] Pre-filter blocks junk (< 2min, no participants, duplicates)
- [ ] Gatekeeper scores and extracts in a single Haiku call
- [ ] Only pass/reject — no quarantine
- [ ] Novelty check prevents duplicate content (> 0.92 similarity)
- [ ] Entity resolution matches known projects by name, alias, or embedding
- [ ] Unmatched entities go to `pending_matches` with daily Slack digest
- [ ] Decisions and action items saved with correct project linkage
- [ ] Impact check detects conflicts and creates `update_suggestions`
- [ ] Slack notifications for conflicts and pending matches
- [ ] Re-embedding worker runs on schedule (every 10 minutes)
- [ ] MCP server exposes all 5 v1 tools + system_health
- [ ] Metrics tracked: query volume, admit rate, zero-match rate
- [ ] The ultimate test passes: "Wat kwam er uit de meeting met [klant]?" returns a correct, source-cited answer within 5 seconds

---

## Verification

- [ ] `metrics` table exists with correct schema
- [ ] Gatekeeper decisions are logged to metrics
- [ ] MCP queries are logged to metrics
- [ ] `system_health` MCP tool returns a complete health report
- [ ] E2E test: full pipeline from webhook to MCP query works
- [ ] Admit rate metric is calculable from last 7 days of data
- [ ] Zero-match rate metric is calculable from last 7 days of data

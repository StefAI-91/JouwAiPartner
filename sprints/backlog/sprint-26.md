# Sprint 26: Frontend — System Health & Insights

**Phase:** 3 — Insights & Delivery
**Requirements:** REQ-1404, REQ-1405, REQ-1205, REQ-1803
**Depends on:** Sprint 09 (metrics), Sprint 22 (insights populated), Sprint 24 (UI patterns)
**Produces:** System Health dashboard + Insights feed + MCP insights tool

---

## Task 1: System Health dashboard

**What:** Visualize the three core metrics + agent run history.

**Create `src/app/health/page.tsx`:**
```typescript
import { createClient } from "@/lib/supabase/server";
import { HealthDashboard } from "@/components/health-dashboard";

export default async function HealthPage() {
  const supabase = await createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  // Query volume
  const { count: queryCount } = await supabase
    .from("metrics").select("id", { count: "exact" })
    .eq("metric_name", "mcp_query").gte("created_at", sevenDaysAgo);

  // Gatekeeper rates
  const { data: decisions } = await supabase
    .from("metrics").select("metric_value")
    .eq("metric_name", "gatekeeper_decision").gte("created_at", sevenDaysAgo);

  const admitted = decisions?.filter((d) => d.metric_value.action === "admit").length || 0;
  const quarantined = decisions?.filter((d) => d.metric_value.action === "quarantine").length || 0;
  const rejected = decisions?.filter((d) => d.metric_value.action === "reject").length || 0;

  // Zero-match rate
  const { count: zeroMatches } = await supabase
    .from("metrics").select("id", { count: "exact" })
    .eq("metric_name", "search_zero_match").gte("created_at", sevenDaysAgo);

  // Embedding staleness
  const tables = ["documents", "meetings", "slack_messages", "emails", "people", "projects"];
  let totalStale = 0;
  for (const table of tables) {
    const { count } = await supabase
      .from(table).select("id", { count: "exact" }).eq("embedding_stale", true);
    totalStale += count || 0;
  }

  // Recent agent runs
  const { data: agentRuns } = await supabase
    .from("content_reviews").select("agent_role, action, created_at")
    .in("agent_role", ["curator", "analyst"]).eq("action", "health_report")
    .order("created_at", { ascending: false }).limit(10);

  return (
    <HealthDashboard
      metrics={{
        queryCount: queryCount || 0,
        admitted, quarantined, rejected,
        zeroMatchRate: queryCount ? ((zeroMatches || 0) / queryCount * 100) : 0,
        staleEmbeddings: totalStale,
        recentAgentRuns: agentRuns || [],
      }}
    />
  );
}
```

**Dashboard component layout:**
- Row 1: Three metric cards (Query Volume, Gatekeeper Rates pie chart, Zero-Match Rate)
- Row 2: Embedding staleness count + Agent run history table
- Use shadcn `Card` components, optionally add a chart library like `recharts` for the pie chart

```bash
npm install recharts
```

---

## Task 2: Insights Feed page

**What:** Browse analyst-generated insights, filterable by topic and timeframe.

**Create `src/app/insights/page.tsx`:**
```typescript
import { createClient } from "@/lib/supabase/server";

export default async function InsightsPage() {
  const supabase = await createClient();

  const { data: insights } = await supabase
    .from("insights")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  // Get unique topics for filter dropdown
  const topics = [...new Set(insights?.map((i) => i.topic).filter(Boolean))];

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Insights</h1>

      {/* Topic filter tabs */}
      {/* Date range picker */}

      <div className="space-y-4">
        {insights?.map((insight) => (
          <Card key={insight.id} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{insight.title}</h3>
                <Badge className="mt-1">{insight.topic || "General"}</Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                {new Date(insight.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="mt-3 text-sm">{insight.body}</p>
            {insight.supporting_sources?.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Based on {insight.supporting_sources.length} source(s)
              </p>
            )}
            <div className="mt-2">
              {insight.dispatched
                ? <Badge variant="outline">Dispatched</Badge>
                : <Badge variant="secondary">Pending dispatch</Badge>
              }
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## Task 3: Add `get_insights` MCP tool

**What:** Let Claude query insights via MCP.

**Add to `mcp-server/src/tools/structured.ts`:**
```typescript
server.tool(
  "get_insights",
  "Get analyst-generated insights about company patterns, risks, and opportunities. Use when someone asks about trends, risks, or what the AI has noticed.",
  {
    topic: z.string().optional().describe("Filter by topic"),
    days: z.number().optional().default(30).describe("Look back N days"),
    limit: z.number().optional().default(10),
  },
  async ({ topic, days, limit }) => {
    const since = new Date(Date.now() - days * 86400000).toISOString();

    let query = supabase
      .from("insights")
      .select("id, title, body, topic, supporting_sources, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (topic) query = query.ilike("topic", `%${topic}%`);

    const { data, error } = await query;

    if (error || !data?.length) {
      return { content: [{ type: "text" as const, text: "No insights found for this period." }] };
    }

    const formatted = data.map((i, idx) =>
      `### ${idx + 1}. ${i.title}\n**Topic:** ${i.topic || "General"} | **Date:** ${new Date(i.created_at).toLocaleDateString()}\n\n${i.body}\n\n*Based on ${i.supporting_sources?.length || 0} source(s)*`
    ).join("\n\n---\n\n");

    return { content: [{ type: "text" as const, text: `## Recent Insights\n\n${formatted}` }] };
  }
);
```

---

## Task 4: Navigation layout

**What:** Add a navigation sidebar/header that connects all pages.

**Create `src/app/layout.tsx` with navigation:**
```typescript
// Sidebar navigation with links to:
// - /knowledge (Knowledge Browser)
// - /people (People Directory)
// - /projects (Projects)
// - /insights (Insights Feed)
// - /quarantine (Quarantine Queue)
// - /health (System Health)
```

Use shadcn `Sidebar` or a simple navigation component. Keep it clean and minimal.

---

## Verification

- [ ] System Health shows query volume, Gatekeeper rates, zero-match rate
- [ ] Stale embedding count is accurate
- [ ] Agent run history shows Curator and Analyst runs with timestamps
- [ ] Insights Feed shows all insights, filterable by topic
- [ ] `get_insights` MCP tool returns insights from Claude Code
- [ ] Navigation connects all dashboard pages
- [ ] All pages enforce RLS (restricted content hidden from non-admins)

**Phase 3 is complete when this sprint passes all checks. The full platform is now operational.**

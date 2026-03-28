# Sprint 26: Frontend — Projects & Quarantine

**Phase:** V3 — Intelligentie & Frontend
**Requirements:** REQ-1402, REQ-1403, REQ-1407
**Depends on:** Sprint 25 (UI patterns established), Sprint 20 (Auth)
**Produces:** Project overview page and team quarantine management

---

## Task 1: Project Overview page

**What:** Show all knowledge linked to a project: team, decisions, action items, meetings, docs.

**Create `src/app/projects/[name]/page.tsx`:**

```typescript
import { createClient } from "@/lib/supabase/server";

export default async function ProjectPage({ params }: { params: { name: string } }) {
  const supabase = await createClient();
  const projectName = decodeURIComponent(params.name);

  // Fetch project entity
  const { data: project } = await supabase
    .from("projects").select("*")
    .or(`name.ilike.%${projectName}%,aliases.cs.{${projectName}}`)
    .single();

  // Fetch related data in parallel
  const [team, decisions, actionItems] = await Promise.all([
    supabase.from("people_projects").select("project, role_in_project, people(name, role)")
      .ilike("project", `%${projectName}%`),
    supabase.from("decisions").select("*")
      .ilike("decision", `%${projectName}%`).order("date", { ascending: false }).limit(10),
    supabase.from("action_items").select("*")
      .ilike("description", `%${projectName}%`).order("created_at", { ascending: false }).limit(10),
  ]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold">{project?.name || projectName}</h1>
      {project?.client && <p className="text-muted-foreground">Client: {project.client}</p>}

      {/* Team section */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Team ({team.data?.length || 0})</h2>
        {/* Render team members with roles */}
      </section>

      {/* Decisions section */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Decisions ({decisions.data?.length || 0})</h2>
        {/* Render decisions with date and who made them */}
      </section>

      {/* Action Items section */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Action Items ({actionItems.data?.length || 0})</h2>
        {/* Render action items with status badges */}
      </section>
    </div>
  );
}
```

**Projects index page `src/app/projects/page.tsx`:** Lists all projects with status and member count.

---

## Task 2: Quarantine Queue page

**What:** Team-specific quarantine review with one-click approve/reject and agent-assisted suggestions.

**Create `src/app/quarantine/page.tsx`:**

```typescript
import { createClient } from "@/lib/supabase/server";
import { QuarantineQueue } from "@/components/quarantine-queue";

export default async function QuarantinePage() {
  const supabase = await createClient();

  // Fetch all quarantined content with the Gatekeeper's reason
  const tables = ["documents", "meetings", "slack_messages", "emails"];
  const quarantined: any[] = [];

  for (const table of tables) {
    const { data } = await supabase
      .from(table)
      .select("id, title, content, relevance_score, category, created_at")
      .eq("status", "quarantined")
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      quarantined.push(...data.map((d) => ({ ...d, source_table: table })));
    }
  }

  // Fetch Gatekeeper reasons for these items
  const ids = quarantined.map((q) => q.id);
  const { data: reviews } = await supabase
    .from("content_reviews")
    .select("content_id, reason, metadata")
    .in("content_id", ids)
    .eq("action", "quarantined");

  const reviewMap = Object.fromEntries(
    (reviews || []).map((r) => [r.content_id, r])
  );

  return <QuarantineQueue items={quarantined} reviews={reviewMap} />;
}
```

**Client component `src/components/quarantine-queue.tsx`:**

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export function QuarantineQueue({ items, reviews }: { items: any[]; reviews: any }) {
  const supabase = createClient();

  async function approve(item: any) {
    // Call API route that promotes content (generates embedding + updates status)
    await fetch("/api/quarantine/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, table: item.source_table }),
    });
    // Optimistic UI update
  }

  async function reject(item: any) {
    await fetch("/api/quarantine/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, table: item.source_table }),
    });
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Quarantine Queue ({items.length})</h1>
      {items.map((item) => (
        <Card key={item.id} className="mb-4 p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{item.title || "Untitled"}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {item.content?.slice(0, 200)}...
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Score: {item.relevance_score?.toFixed(2)} |
                Reason: {reviews[item.id]?.reason || "No reason recorded"} |
                Source: {item.source_table}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="default" size="sm" onClick={() => approve(item)}>
                Approve
              </Button>
              <Button variant="destructive" size="sm" onClick={() => reject(item)}>
                Reject
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

**API routes for approve/reject:**

```typescript
// src/app/api/quarantine/approve/route.ts
import { embedText } from "@/lib/embeddings";

export async function POST(req: Request) {
  const { id, table } = await req.json();
  const supabase = await createClient();

  // Fetch content for embedding
  const { data } = await supabase.from(table).select("content, body").eq("id", id).single();
  const text = data?.content || data?.body || "";
  const embedding = await embedText(text);

  await supabase
    .from(table)
    .update({
      status: "active",
      embedding: embedding as any,
      embedding_stale: false,
    })
    .eq("id", id);

  await supabase.from("content_reviews").insert({
    content_id: id,
    content_table: table,
    agent_role: "human",
    action: "promoted",
    reason: "Manually approved from quarantine queue",
  });

  return NextResponse.json({ success: true });
}
```

---

## Task 3: Role-based views

**What:** Ensure users only see quarantine items relevant to their team.

```typescript
// In QuarantinePage, filter by user's team:
const {
  data: { user },
} = await supabase.auth.getUser();
const { data: profile } = await supabase
  .from("user_profiles")
  .select("team, role")
  .eq("id", user?.id)
  .single();

// Admin sees everything, members see their team's content
// Filter quarantine items based on the source channel/team mapping
```

---

## Verification

- [ ] Project page shows team, decisions, and action items for a given project
- [ ] Projects index lists all projects with basic stats
- [ ] Quarantine queue shows all quarantined content with Gatekeeper reasoning
- [ ] One-click approve generates embedding and promotes to active
- [ ] One-click reject archives the content
- [ ] Actions are logged to `content_reviews` with agent_role='human'
- [ ] Users see quarantine items appropriate to their role

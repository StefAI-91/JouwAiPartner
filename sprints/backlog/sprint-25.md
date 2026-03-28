# Sprint 25: Frontend — Knowledge Browser & People Directory

**Phase:** V3 — Intelligentie & Frontend
**Requirements:** REQ-1400, REQ-1401, REQ-1406, REQ-1408
**Depends on:** Sprint 01 (Next.js), Sprint 20 (Auth + RLS)
**Produces:** Browseable knowledge base and people directory in the web UI

---

## Task 1: Knowledge Browser page

**What:** Browse and search all content with filters by source, category, date, and status.

**Create `src/app/knowledge/page.tsx`:**

```typescript
// Server component that fetches initial data
import { createClient } from "@/lib/supabase/server";
import { KnowledgeBrowser } from "@/components/knowledge-browser";

export default async function KnowledgePage() {
  const supabase = await createClient();

  // Fetch recent content across all tables
  const [documents, meetings, slackMessages] = await Promise.all([
    supabase.from("documents").select("id, title, source, category, status, relevance_score, created_at")
      .eq("status", "active").order("created_at", { ascending: false }).limit(50),
    supabase.from("meetings").select("id, title, date, participants, category, status, relevance_score, created_at")
      .eq("status", "active").order("created_at", { ascending: false }).limit(50),
    supabase.from("slack_messages").select("id, channel, author, category, status, relevance_score, timestamp")
      .eq("status", "active").order("timestamp", { ascending: false }).limit(50),
  ]);

  const allContent = [
    ...(documents.data || []).map((d) => ({ ...d, source_type: "document" })),
    ...(meetings.data || []).map((m) => ({ ...m, source_type: "meeting" })),
    ...(slackMessages.data || []).map((s) => ({ ...s, source_type: "slack" })),
  ].sort((a, b) => new Date(b.created_at || b.timestamp).getTime() - new Date(a.created_at || a.timestamp).getTime());

  return <KnowledgeBrowser initialContent={allContent} />;
}
```

**Create `src/components/knowledge-browser.tsx`:** (Client component)

```typescript
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Component with:
// - Search bar (text filter)
// - Source filter dropdown (all / documents / meetings / slack / email)
// - Category filter (decision / context / action_item / reference / insight)
// - Content cards showing: title, source type badge, categories, date, relevance score
// - Click to expand and see full content
```

**Key UI components needed (install via shadcn):**

```bash
npx shadcn@latest add input select card badge table dialog tabs
```

---

## Task 2: People Directory page

**What:** Browse people profiles with their skills and project involvement.

**Create `src/app/people/page.tsx`:**

```typescript
import { createClient } from "@/lib/supabase/server";

export default async function PeoplePage() {
  const supabase = await createClient();

  const { data: people } = await supabase
    .from("people")
    .select(`
      id, name, team, role,
      people_skills(skill, evidence_count),
      people_projects(project, role_in_project)
    `)
    .order("name");

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">People Directory</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {people?.map((person) => (
          <PersonCard key={person.id} person={person} />
        ))}
      </div>
    </div>
  );
}

function PersonCard({ person }: { person: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{person.name}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {person.role || "No role"} · {person.team || "No team"}
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <p className="text-xs font-medium mb-1">Skills</p>
          <div className="flex flex-wrap gap-1">
            {person.people_skills?.slice(0, 5).map((s: any) => (
              <Badge key={s.skill} variant="secondary">
                {s.skill} ({s.evidence_count})
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium mb-1">Projects</p>
          <div className="flex flex-wrap gap-1">
            {person.people_projects?.map((p: any) => (
              <Badge key={p.project} variant="outline">
                {p.project}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Task 3: Real-time subscriptions

**What:** Use Supabase Realtime to update the UI when new content is ingested.

```typescript
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeContent(initialContent: any[]) {
  const [content, setContent] = useState(initialContent);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("content-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "meetings",
          filter: "status=eq.active",
        },
        (payload) => {
          setContent((prev) => [{ ...payload.new, source_type: "meeting" }, ...prev]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "documents",
          filter: "status=eq.active",
        },
        (payload) => {
          setContent((prev) => [{ ...payload.new, source_type: "document" }, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return content;
}
```

**Enable Realtime in Supabase Dashboard:** Database → Replication → enable replication for `meetings`, `documents`, `slack_messages`, `emails` tables.

---

## Verification

- [ ] Knowledge Browser shows content from all sources with correct badges
- [ ] Filters work: source type, category, search text
- [ ] People Directory shows all people with skills and projects
- [ ] Skill evidence counts are displayed
- [ ] New content appears in real-time without page refresh
- [ ] RLS is enforced: restricted content hidden from non-admin users

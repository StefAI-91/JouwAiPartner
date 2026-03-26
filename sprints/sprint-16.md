# Sprint 16: Curator — Advanced Checks

**Phase:** 2 — Expand Sources & Agents
**Requirements:** REQ-704, REQ-706, REQ-1703
**Depends on:** Sprint 15 (Curator base agent)
**Produces:** Contradiction detection, quarantine auto-review, and 30-day auto-reject

---

## Task 1: Contradiction detection

**What:** Add a tool and prompt extension to the Curator that finds conflicting statements about the same topic.

**Add tool to `CURATOR_TOOLS`:**
```typescript
{
  name: "find_contradictions",
  description: "Search for entries on the same topic that contain conflicting information.",
  input_schema: {
    type: "object" as const,
    properties: {
      topic: { type: "string", description: "Topic to check for contradictions" },
    },
    required: ["topic"],
  },
}
```

**Implementation:** Embed the topic, find similar entries, then pass the top matches to the Curator to reason about contradictions. The Curator uses Claude Sonnet's reasoning to determine if statements actually conflict.

```typescript
case "find_contradictions": {
  const topicEmbedding = await embedText(input.topic);
  const { data } = await supabase.rpc("search_all_content", {
    query_embedding: topicEmbedding,
    match_threshold: 0.80,
    match_count: 10,
  });
  return JSON.stringify({
    topic: input.topic,
    related_entries: (data || []).map((d: any) => ({
      id: d.id,
      source: d.source_table,
      content: d.content?.slice(0, 300),
      title: d.title,
    })),
  });
}
```

The Curator prompt instructs it to review the entries and flag genuine contradictions (not just different perspectives).

---

## Task 2: Quarantine auto-review

**What:** The Curator reviews quarantined content and auto-promotes or auto-rejects based on patterns.

**Add tool:**
```typescript
{
  name: "review_quarantine",
  description: "Get quarantined entries for review. Decide whether to promote (admit) or reject each one.",
  input_schema: {
    type: "object" as const,
    properties: {
      table: { type: "string" },
      limit: { type: "number" },
    },
    required: ["table"],
  },
},
{
  name: "promote_content",
  description: "Promote quarantined content to active status.",
  input_schema: {
    type: "object" as const,
    properties: {
      table: { type: "string" },
      id: { type: "string" },
      reason: { type: "string" },
    },
    required: ["table", "id", "reason"],
  },
}
```

**Implementation:**
```typescript
case "review_quarantine": {
  const { data } = await supabase
    .from(input.table)
    .select("id, title, content, relevance_score, category, created_at")
    .eq("status", "quarantined")
    .order("created_at", { ascending: true })
    .limit(input.limit || 10);
  return JSON.stringify({ quarantined: data || [] });
}

case "promote_content": {
  const embedding = await embedText(
    (await supabase.from(input.table).select("content").eq("id", input.id).single()).data?.content || ""
  );
  await supabase.from(input.table).update({
    status: "active",
    embedding: embedding as any,
    embedding_stale: false,
  }).eq("id", input.id);
  await supabase.from("content_reviews").insert({
    content_id: input.id,
    content_table: input.table,
    agent_role: "curator",
    action: "promoted",
    reason: input.reason,
  });
  return JSON.stringify({ success: true });
}
```

---

## Task 3: Auto-reject quarantined content after 30 days

**What:** Scheduled job that rejects quarantined entries older than 30 days.

```sql
-- Run daily at 3 AM (after Curator at 2 AM)
SELECT cron.schedule(
    'quarantine-auto-reject',
    '0 3 * * *',
    $$
    WITH expired AS (
        UPDATE documents SET status = 'archived'
        WHERE status = 'quarantined' AND created_at < NOW() - INTERVAL '30 days'
        RETURNING id, 'documents' AS tbl
    ), expired_meetings AS (
        UPDATE meetings SET status = 'archived'
        WHERE status = 'quarantined' AND created_at < NOW() - INTERVAL '30 days'
        RETURNING id, 'meetings' AS tbl
    ), expired_slack AS (
        UPDATE slack_messages SET status = 'archived'
        WHERE status = 'quarantined' AND created_at < NOW() - INTERVAL '30 days'
        RETURNING id, 'slack_messages' AS tbl
    ), expired_emails AS (
        UPDATE emails SET status = 'archived'
        WHERE status = 'quarantined' AND created_at < NOW() - INTERVAL '30 days'
        RETURNING id, 'emails' AS tbl
    ), all_expired AS (
        SELECT * FROM expired
        UNION ALL SELECT * FROM expired_meetings
        UNION ALL SELECT * FROM expired_slack
        UNION ALL SELECT * FROM expired_emails
    )
    INSERT INTO content_reviews (content_id, content_table, agent_role, action, reason)
    SELECT id, tbl, 'system', 'auto_rejected', 'Quarantined content expired after 30 days without review'
    FROM all_expired;
    $$
);
```

---

## Verification

- [ ] Curator finds contradicting statements on the same topic
- [ ] Contradictions are flagged with specific entries cited
- [ ] Quarantined content is reviewed: some promoted (with embedding generated), some rejected
- [ ] Auto-reject runs daily: quarantined entries older than 30 days get archived
- [ ] All actions logged to `content_reviews`

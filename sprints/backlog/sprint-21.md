# Sprint 21: Entity Resolution Advanced & Retention

**Phase:** V2 — Toegang & Kwaliteit
**Requirements:** REQ-1605, REQ-1606, REQ-1700–REQ-1702
**Depends on:** Sprint 06 (extraction pipeline), Sprint 02 (projects table with aliases)
**Produces:** Cross-source entity linking + automated data lifecycle management

---

## Task 1: Entity matching during ingestion

**What:** When the extractor finds a project mention, match it against existing `projects.aliases`.

**Add to `src/lib/agents/extractor.ts` in `saveExtractions()`:**

```typescript
// After extracting people, before inserting decisions:
for (const person of result.people) {
  for (const project of person.projects) {
    // Try to match project name against existing projects
    const matchedProject = await matchProjectEntity(project.name);

    if (matchedProject) {
      // Use the canonical project name
      await supabase.from("people_projects").upsert(
        {
          person_id: personId,
          project: matchedProject.name, // canonical name
          role_in_project: project.role || null,
          last_mentioned: new Date().toISOString(),
          source_ids: [{ source_type: source.type, source_id: source.id }],
        },
        { onConflict: "person_id,project" },
      );
    } else {
      // No match — create new project entity
      await supabase.from("projects").insert({
        name: project.name,
        aliases: [project.name],
        embedding_stale: true,
      });
    }
  }
}

async function matchProjectEntity(name: string): Promise<{ id: string; name: string } | null> {
  // Check exact name match
  const { data: exact } = await supabase
    .from("projects")
    .select("id, name")
    .ilike("name", name)
    .single();
  if (exact) return exact;

  // Check aliases (Postgres array contains)
  const { data: aliasMatch } = await supabase
    .from("projects")
    .select("id, name")
    .contains("aliases", [name])
    .single();
  if (aliasMatch) return aliasMatch;

  // Fuzzy match: embed the name and check similarity against project embeddings
  const embedding = await embedText(name);
  const { data: semantic } = await supabase.rpc("match_projects", {
    query_embedding: embedding,
    match_threshold: 0.88, // high threshold — we need to be sure
    match_count: 1,
  });

  if (semantic && semantic.length > 0) {
    // Add this name as an alias for the matched project
    const project = semantic[0];
    const { data: current } = await supabase
      .from("projects")
      .select("aliases")
      .eq("id", project.id)
      .single();
    const aliases = current?.aliases || [];
    if (!aliases.includes(name)) {
      aliases.push(name);
      await supabase.from("projects").update({ aliases }).eq("id", project.id);
    }
    return { id: project.id, name: project.name };
  }

  return null;
}
```

**Add the match_projects RPC function:**

```sql
CREATE OR REPLACE FUNCTION match_projects(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.85,
    match_count INT DEFAULT 3
)
RETURNS TABLE (id UUID, name TEXT, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.name, 1 - (p.embedding <=> query_embedding) AS similarity
    FROM projects p
    WHERE p.embedding IS NOT NULL
      AND 1 - (p.embedding <=> query_embedding) > match_threshold
    ORDER BY p.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
```

---

## Task 2: Retention policy automation

**What:** Scheduled jobs to enforce retention rules.

```sql
-- Run weekly: archive old content, purge expired rejections
SELECT cron.schedule(
    'retention-cleanup',
    '0 4 * * 0',    -- Sunday at 4 AM
    $$
    -- Drop embeddings from archived content older than 12 months
    UPDATE documents SET embedding = NULL
    WHERE status = 'archived' AND updated_at < NOW() - INTERVAL '12 months' AND embedding IS NOT NULL;

    UPDATE meetings SET embedding = NULL
    WHERE status = 'archived' AND updated_at < NOW() - INTERVAL '12 months' AND embedding IS NOT NULL;

    UPDATE slack_messages SET embedding = NULL
    WHERE status = 'archived' AND updated_at < NOW() - INTERVAL '12 months' AND embedding IS NOT NULL;

    UPDATE emails SET embedding = NULL
    WHERE status = 'archived' AND updated_at < NOW() - INTERVAL '12 months' AND embedding IS NOT NULL;

    -- Purge rejected content metadata older than 90 days
    DELETE FROM content_reviews
    WHERE action = 'rejected' AND created_at < NOW() - INTERVAL '90 days';
    $$
);
```

---

## Task 3: Entity dedup in Curator

**What:** Add project entity deduplication to the Curator's nightly sweep (already partially done in Sprint 17/18). Ensure the Curator checks for project aliases that should be merged.

Add to Curator system prompt:

```
5. ENTITY DEDUP: Check for projects that appear to be duplicates (similar names or overlapping aliases). Propose merges if confident.
```

---

## Verification

- [ ] New project mentions match against existing projects by name, alias, or embedding
- [ ] Unmatched projects create new entities with the name as first alias
- [ ] Fuzzy matches add the new name as an alias to the existing project
- [ ] Archived content older than 12 months has embeddings dropped (raw text preserved)
- [ ] Rejected content metadata is purged after 90 days
- [ ] Retention cron job runs weekly

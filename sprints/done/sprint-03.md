# Sprint 03: DB Migration + Embedding Service

**Phase:** V1 — Data Pipeline
**Requirements:** REQ-104, REQ-1100–REQ-1105, REQ-106
**Depends on:** Sprint 02 (tables with `embedding` and `embedding_stale` columns exist, already deployed)
**Produces:** Database migration for v1 schema additions, reusable embedding utility, background re-embedding worker, `match_projects` RPC function

---

## Task 1: Database migration (ALTER tables + new tables)

**What:** Sprint 02 is already deployed. This sprint adds columns and tables required by the v1 PRD: `project_id` foreign keys on content tables, `scope` on action_items, plus new `pending_matches` and `update_suggestions` tables.

**Run these migrations in Supabase SQL Editor (or as a migration file):**

```sql
-- ============================================================
-- 1. Add project_id to meetings, decisions, action_items
-- ============================================================

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

ALTER TABLE action_items
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- ============================================================
-- 2. Add scope to action_items
-- ============================================================

ALTER TABLE action_items
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'project';

COMMENT ON COLUMN action_items.scope IS 'project or personal — indicates whether this action item belongs to a project or is a personal task';

-- ============================================================
-- 3. Add embedding + embedding_stale to decisions
-- ============================================================

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS embedding VECTOR(1536),
  ADD COLUMN IF NOT EXISTS embedding_stale BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_decisions_embedding ON decisions
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- ============================================================
-- 4. Create pending_matches table
-- ============================================================

CREATE TABLE IF NOT EXISTS pending_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL,
    content_table TEXT NOT NULL,          -- 'meetings', 'decisions', etc.
    extracted_name TEXT NOT NULL,         -- what the AI extracted
    suggested_match_id UUID,             -- best embedding match (optional)
    similarity_score FLOAT,
    status TEXT DEFAULT 'pending',        -- 'pending', 'resolved', 'new_created'
    resolved_by TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_matches_status ON pending_matches(status);

-- ============================================================
-- 5. Create update_suggestions table
-- ============================================================

CREATE TABLE IF NOT EXISTS update_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_content_id UUID,              -- which document is potentially outdated
    target_table TEXT,
    trigger_source_id UUID,              -- what triggered the suggestion
    trigger_source_type TEXT,
    current_content TEXT,                -- what it currently says
    new_content TEXT,                    -- what it should say
    reason TEXT,
    status TEXT DEFAULT 'pending',        -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_update_suggestions_status ON update_suggestions(status);

-- ============================================================
-- 6. Create match_projects RPC function
-- ============================================================

CREATE OR REPLACE FUNCTION match_projects(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.85,
    match_count INT DEFAULT 3
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    aliases TEXT[],
    client TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.aliases,
        p.client,
        1 - (p.embedding <=> query_embedding) AS similarity
    FROM projects p
    WHERE p.embedding IS NOT NULL
      AND 1 - (p.embedding <=> query_embedding) > match_threshold
    ORDER BY p.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
```

**Key details:**

- All `ALTER TABLE` uses `IF NOT EXISTS` to be idempotent
- `match_projects` uses the same HNSW index created in Sprint 02 for the `projects` table
- `pending_matches` tracks unresolved entity matches for human review
- `update_suggestions` stores conflict-detection results (Sprint 07)
- `decisions` gets embedding support for impact checking (Sprint 07)

---

## Task 2: Build embedding utility

**What:** Shared function that takes text and returns an OpenAI embedding vector. Used by all ingestion pipelines and the re-embedding worker.

**Create `src/lib/embeddings.ts`:**

```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const MAX_TOKENS = 8191; // model limit

/**
 * Embed a single text string.
 * Returns a number[] of length 1536.
 */
export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, MAX_TOKENS * 4), // rough char limit (~4 chars/token)
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}

/**
 * Embed multiple texts in a single API call (batch).
 * Max 2048 inputs per request.
 * Returns number[][] in same order as input.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 2048;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE).map((t) => t.slice(0, MAX_TOKENS * 4));

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    // Sort by index to maintain order
    const sorted = response.data.sort((a, b) => a.index - b.index);
    allEmbeddings.push(...sorted.map((d) => d.embedding));
  }

  return allEmbeddings;
}
```

**Key details:**

- `text-embedding-3-small` returns 1536 dimensions by default
- Max 8,191 tokens per input (~32K characters)
- Batch endpoint accepts up to 2,048 inputs per call
- Cost: ~$0.02 per 1M tokens — very cheap

---

## Task 3: Build re-embedding worker

**What:** Background function that finds stale embeddings and refreshes them. Runs every 10 minutes via pg_cron. Processes batches of 50 rows per table.

**Create `src/lib/re-embed-worker.ts`:**

```typescript
import { createClient } from "@supabase/supabase-js";
import { embedBatch } from "./embeddings";

// Use service role key — this runs server-side, needs to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const BATCH_SIZE = 50;

// Tables that have embeddings (v1: meetings, decisions, projects)
const EMBEDDABLE_TABLES = [
  { table: "meetings", contentField: "summary" },
  { table: "decisions", contentField: "decision" },
  { table: "projects", contentField: "name" },
] as const;

/**
 * Process stale embeddings for a single table.
 * Returns the number of rows re-embedded.
 */
async function reEmbedTable(table: string, contentField: string): Promise<number> {
  // Fetch stale rows
  const { data: staleRows, error } = await supabase
    .from(table)
    .select(`id, ${contentField}`)
    .eq("embedding_stale", true)
    .limit(BATCH_SIZE);

  if (error || !staleRows || staleRows.length === 0) return 0;

  // Extract texts for batch embedding
  const texts = staleRows.map((row) => row[contentField] || "");
  const embeddings = await embedBatch(texts);

  // Update each row with new embedding
  for (let i = 0; i < staleRows.length; i++) {
    await supabase
      .from(table)
      .update({
        embedding: embeddings[i] as any,
        embedding_stale: false,
      })
      .eq("id", staleRows[i].id);
  }

  return staleRows.length;
}

/**
 * Main worker entry point. Call this from the cron job.
 */
export async function runReEmbedWorker(): Promise<{
  total: number;
  byTable: Record<string, number>;
}> {
  const results: Record<string, number> = {};

  for (const { table, contentField } of EMBEDDABLE_TABLES) {
    results[table] = await reEmbedTable(table, contentField);
  }

  const total = Object.values(results).reduce((sum, n) => sum + n, 0);
  return { total, byTable: results };
}
```

**Create the Supabase Edge Function `supabase/functions/re-embed-worker/index.ts`:**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Verify the request is from pg_cron (check Authorization header)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Re-embed logic here (same as above, adapted for Deno)
  // ... process stale embeddings ...

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

Deploy: `supabase functions deploy re-embed-worker --no-verify-jwt`

**Schedule via pg_cron (every 10 minutes per PRD):**

```sql
SELECT cron.schedule(
    're-embed-stale',
    '*/10 * * * *',    -- every 10 minutes
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT.supabase.co/functions/v1/re-embed-worker',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
            'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
);
```

**Technical notes:**

- Batches of 50 to avoid timeouts on Edge Functions (150s limit)
- Uses service role key to bypass RLS
- v1 only embeds meetings (summary), decisions, and projects — no documents, slack, or emails yet

---

## Verification

- [ ] Migration runs without errors — all columns and tables created
- [ ] `SELECT column_name FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'project_id';` returns a row
- [ ] `SELECT column_name FROM information_schema.columns WHERE table_name = 'action_items' AND column_name = 'scope';` returns a row
- [ ] `pending_matches` and `update_suggestions` tables exist
- [ ] `SELECT * FROM match_projects('[0,0,...,0]'::vector(1536), 0.0, 1);` executes without error
- [ ] `embedText("hello world")` returns a 1536-length number array
- [ ] `embedBatch(["hello", "world"])` returns two 1536-length arrays
- [ ] Insert a row with `embedding_stale = true`, run worker, verify embedding is populated and flag is false
- [ ] pg_cron job appears in `SELECT * FROM cron.job;`

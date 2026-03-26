# Sprint 03: Embedding Service

**Phase:** 1 — Foundation
**Requirements:** REQ-104, REQ-1100–REQ-1105, REQ-106
**Depends on:** Sprint 02 (tables with `embedding` and `embedding_stale` columns exist)
**Produces:** Reusable embedding utility + background re-embedding worker

---

## Task 1: Build embedding utility

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
    const batch = texts.slice(i, i + BATCH_SIZE).map(
      (t) => t.slice(0, MAX_TOKENS * 4)
    );

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

## Task 2: Build re-embedding worker

**What:** Background function that finds stale embeddings and refreshes them. Runs every 5-10 minutes.

**Create `src/lib/re-embed-worker.ts`:**
```typescript
import { createClient } from "@supabase/supabase-js";
import { embedText, embedBatch } from "./embeddings";

// Use service role key — this runs server-side, needs to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BATCH_SIZE = 50;

// Tables that have embeddings
const EMBEDDABLE_TABLES = [
  { table: "documents", contentField: "content" },
  { table: "meetings", contentField: "summary" },
  { table: "slack_messages", contentField: "content" },
  { table: "emails", contentField: "body" },
  { table: "projects", contentField: "name" },
] as const;

/**
 * Process stale embeddings for a single table.
 * Returns the number of rows re-embedded.
 */
async function reEmbedTable(
  table: string,
  contentField: string
): Promise<number> {
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
 * Special handler for people table: aggregate profile before embedding.
 */
async function reEmbedPeople(): Promise<number> {
  const { data: stalePeople, error } = await supabase
    .from("people")
    .select("id, name, team, role")
    .eq("embedding_stale", true)
    .limit(BATCH_SIZE);

  if (error || !stalePeople || stalePeople.length === 0) return 0;

  for (const person of stalePeople) {
    // Fetch skills
    const { data: skills } = await supabase
      .from("people_skills")
      .select("skill, evidence_count")
      .eq("person_id", person.id);

    // Fetch projects
    const { data: projects } = await supabase
      .from("people_projects")
      .select("project, role_in_project")
      .eq("person_id", person.id);

    // Build profile text for embedding
    const profileText = buildProfileText(person, skills || [], projects || []);
    const embedding = await embedText(profileText);

    await supabase
      .from("people")
      .update({ embedding: embedding as any, embedding_stale: false })
      .eq("id", person.id);
  }

  return stalePeople.length;
}

/**
 * Aggregate person data into a text profile for embedding.
 */
function buildProfileText(
  person: { name: string; team: string | null; role: string | null },
  skills: { skill: string; evidence_count: number }[],
  projects: { project: string; role_in_project: string | null }[]
): string {
  const lines = [`${person.name}`];
  if (person.role) lines.push(`Role: ${person.role}`);
  if (person.team) lines.push(`Team: ${person.team}`);

  if (skills.length > 0) {
    const sorted = skills.sort((a, b) => b.evidence_count - a.evidence_count);
    lines.push(`Skills: ${sorted.map((s) => s.skill).join(", ")}`);
  }

  if (projects.length > 0) {
    lines.push(
      `Projects: ${projects.map((p) => `${p.project}${p.role_in_project ? ` (${p.role_in_project})` : ""}`).join(", ")}`
    );
  }

  return lines.join("\n");
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

  results["people"] = await reEmbedPeople();

  const total = Object.values(results).reduce((sum, n) => sum + n, 0);
  return { total, byTable: results };
}
```

**Technical notes:**
- People embeddings are special: they aggregate skills + projects into a text profile, then embed that
- Batches of 50 to avoid timeouts on Edge Functions (150s limit)
- Uses service role key to bypass RLS

---

## Task 3: Schedule the re-embedding worker

**What:** Set up pg_cron to call the re-embedding worker every 5 minutes.

**Option A: Via Supabase Edge Function**

Create `supabase/functions/re-embed-worker/index.ts`:
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
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Re-embed logic here (same as above, adapted for Deno)
  // ... process stale embeddings ...

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

Deploy: `supabase functions deploy re-embed-worker --no-verify-jwt`

**Schedule via pg_cron:**
```sql
SELECT cron.schedule(
    're-embed-stale',
    '*/5 * * * *',    -- every 5 minutes
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

**Alternative:** Store the service role key as a Supabase vault secret and reference it in the cron job.

---

## Verification

- [ ] `embedText("hello world")` returns a 1536-length number array
- [ ] `embedBatch(["hello", "world"])` returns two 1536-length arrays
- [ ] Insert a row with `embedding_stale = true`, run worker, verify embedding is populated and flag is false
- [ ] People profile embedding aggregates skills and projects correctly
- [ ] pg_cron job appears in `SELECT * FROM cron.job;`
- [ ] Worker runs on schedule: check `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;`

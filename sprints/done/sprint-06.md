# Sprint 06: Entity Resolution + Pending Matches

**Phase:** V1 — Data Pipeline
**Requirements:** REQ-605, REQ-1600–REQ-1607
**Depends on:** Sprint 05 (Gatekeeper pipeline produces extracted entities, decisions, action_items)
**Produces:** Entity resolution that matches extracted names to projects/clients, saves structured data to correct tables, and creates pending_matches for unresolved items. Daily Slack digest for unmatched entities.

---

## Task 1: Entity resolution (embedding-based matching)

**What:** After the Gatekeeper extracts project/client names, match them against the `projects` table using a two-step strategy from the PRD:

1. Exact match on name or alias (ILIKE + ANY(aliases))
2. Embedding match via `match_projects` RPC (threshold 0.85)
3. If high-similarity match found, add as alias automatically
4. If no match, create entry in `pending_matches` table

**Create `src/lib/entity-resolution.ts`:**

```typescript
import { createClient } from "@supabase/supabase-js";
import { embedText } from "./embeddings";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface MatchResult {
  matched: boolean;
  project_id: string | null;
  match_type: "exact" | "alias" | "embedding" | "none";
  similarity?: number;
}

/**
 * Resolve an extracted project/client name against the database.
 * Uses the PRD's two-step matching strategy:
 * 1. Exact match on name or alias
 * 2. Embedding similarity match
 */
export async function resolveProject(extractedName: string): Promise<MatchResult> {
  // ── Step 1: Exact match on name or alias (ILIKE + ANY(aliases)) ──
  const { data: exactMatch } = await supabase
    .from("projects")
    .select("id, name, aliases")
    .or(`name.ilike.%${extractedName}%`)
    .limit(1)
    .single();

  if (exactMatch) {
    return {
      matched: true,
      project_id: exactMatch.id,
      match_type: "exact",
    };
  }

  // Check aliases separately (Supabase doesn't support ANY() in .or() easily)
  const { data: aliasMatches } = await supabase.rpc("match_project_by_alias", {
    search_name: extractedName,
  });

  // If no RPC exists yet, use a raw query approach:
  // SELECT * FROM projects WHERE $1 ILIKE ANY(aliases)
  // For now, do a broader search and filter client-side:
  const { data: allProjects } = await supabase.from("projects").select("id, name, aliases");

  if (allProjects) {
    const aliasMatch = allProjects.find((p) =>
      p.aliases?.some(
        (alias: string) =>
          alias.toLowerCase().includes(extractedName.toLowerCase()) ||
          extractedName.toLowerCase().includes(alias.toLowerCase()),
      ),
    );

    if (aliasMatch) {
      return {
        matched: true,
        project_id: aliasMatch.id,
        match_type: "alias",
      };
    }
  }

  // ── Step 2: Embedding match via match_projects RPC ──
  const embedding = await embedText(extractedName);
  const { data: embeddingMatches, error } = await supabase.rpc("match_projects", {
    query_embedding: embedding,
    match_threshold: 0.85,
    match_count: 3,
  });

  if (!error && embeddingMatches && embeddingMatches.length > 0) {
    const bestMatch = embeddingMatches[0];

    // High similarity match found — add as alias automatically
    const currentAliases = bestMatch.aliases || [];
    if (!currentAliases.includes(extractedName)) {
      await supabase
        .from("projects")
        .update({
          aliases: [...currentAliases, extractedName],
          updated_at: new Date().toISOString(),
        })
        .eq("id", bestMatch.id);
    }

    return {
      matched: true,
      project_id: bestMatch.id,
      match_type: "embedding",
      similarity: bestMatch.similarity,
    };
  }

  // ── No match found ──
  return {
    matched: false,
    project_id: null,
    match_type: "none",
  };
}

/**
 * Create a pending_matches entry for an unresolved name.
 * Content is NOT lost — the meeting is stored with project_id: null.
 */
export async function createPendingMatch(
  contentId: string,
  contentTable: string,
  extractedName: string,
  suggestedMatchId?: string,
  similarityScore?: number,
): Promise<void> {
  await supabase.from("pending_matches").insert({
    content_id: contentId,
    content_table: contentTable,
    extracted_name: extractedName,
    suggested_match_id: suggestedMatchId || null,
    similarity_score: similarityScore || null,
    status: "pending",
  });
}

/**
 * Resolve all entities from a Gatekeeper output.
 * Matches projects and clients, returns a map of name → project_id.
 */
export async function resolveAllEntities(
  entities: {
    projects: string[];
    clients: string[];
  },
  contentId: string,
  contentTable: string,
): Promise<Map<string, string | null>> {
  const resolutions = new Map<string, string | null>();

  // Combine projects and clients — both need resolution
  const allNames = [...new Set([...entities.projects, ...entities.clients])];

  for (const name of allNames) {
    const result = await resolveProject(name);
    resolutions.set(name, result.project_id);

    if (!result.matched) {
      // Create pending match for human review
      await createPendingMatch(contentId, contentTable, name);
    }
  }

  return resolutions;
}
```

---

## Task 2: Save extracted data to correct tables

**What:** After entity resolution, save the Gatekeeper's extracted data to the proper tables: decisions, action_items (with scope and project_id), and update the meeting with project_id.

**Create `src/lib/save-extractions.ts`:**

```typescript
import { createClient } from "@supabase/supabase-js";
import { GatekeeperOutput } from "./agents/gatekeeper";
import { resolveAllEntities, resolveProject } from "./entity-resolution";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Save all extracted data from the Gatekeeper output to the database.
 * Runs entity resolution first, then inserts with correct project_id linkage.
 */
export async function saveExtractions(
  gatekeeperResult: GatekeeperOutput,
  meetingId: string,
): Promise<{
  decisions_saved: number;
  action_items_saved: number;
  pending_matches_created: number;
}> {
  let pendingMatchesCreated = 0;

  // ── Step 1: Resolve all entities ──
  const entityResolutions = await resolveAllEntities(
    gatekeeperResult.entities,
    meetingId,
    "meetings",
  );

  // ── Step 2: Determine meeting's primary project ──
  // Use the first resolved project from project_updates, or entities.projects
  let meetingProjectId: string | null = null;

  if (gatekeeperResult.project_updates.length > 0) {
    const primaryProject = gatekeeperResult.project_updates[0].project;
    meetingProjectId = entityResolutions.get(primaryProject) || null;
  }

  if (!meetingProjectId && gatekeeperResult.entities.projects.length > 0) {
    meetingProjectId = entityResolutions.get(gatekeeperResult.entities.projects[0]) || null;
  }

  // Update meeting with project_id
  if (meetingProjectId) {
    await supabase.from("meetings").update({ project_id: meetingProjectId }).eq("id", meetingId);
  }

  // ── Step 3: Save decisions ──
  for (const decision of gatekeeperResult.decisions) {
    // Try to resolve the project for this decision
    let decisionProjectId = meetingProjectId; // default to meeting's project

    await supabase.from("decisions").insert({
      decision: decision.decision,
      context: null,
      made_by: decision.made_by,
      source_type: "meeting",
      source_id: meetingId,
      project_id: decisionProjectId,
      date: new Date().toISOString(),
      status: "active",
      embedding_stale: true, // re-embed worker will handle
    });
  }

  // ── Step 4: Save action items with scope and project_id ──
  for (const item of gatekeeperResult.action_items) {
    let actionProjectId: string | null = null;

    if (item.scope === "project" && item.project) {
      // Resolve the specific project for this action item
      const resolution = await resolveProject(item.project);
      actionProjectId = resolution.project_id;

      if (!resolution.matched) {
        pendingMatchesCreated++;
        // pending_match already created by resolveProject if called via resolveAllEntities
      }
    }

    await supabase.from("action_items").insert({
      description: item.description,
      assignee: item.assignee || null,
      due_date: item.deadline || null,
      scope: item.scope,
      status: "open",
      source_type: "meeting",
      source_id: meetingId,
      project_id: actionProjectId || meetingProjectId,
    });
  }

  // Count pending matches
  for (const [, projectId] of entityResolutions) {
    if (projectId === null) pendingMatchesCreated++;
  }

  return {
    decisions_saved: gatekeeperResult.decisions.length,
    action_items_saved: gatekeeperResult.action_items.length,
    pending_matches_created: pendingMatchesCreated,
  };
}
```

**Integrate into the Gatekeeper pipeline (`processMeeting` in `gatekeeper-pipeline.ts`):**

```typescript
// After successful admission (action === "pass" && meetingId):
if (result.action === "pass" && meetingId) {
  const extractionResults = await saveExtractions(result, meetingId);
  console.log(
    `Saved: ${extractionResults.decisions_saved} decisions, ` +
      `${extractionResults.action_items_saved} action items, ` +
      `${extractionResults.pending_matches_created} pending matches`,
  );
}
```

---

## Task 3: Daily digest — Slack notification for pending matches

**What:** A scheduled function that queries `pending_matches` where `status = 'pending'`, formats a summary, and posts to Slack via webhook.

**Create `src/lib/pending-matches-digest.ts`:**

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Generate and send a daily digest of pending matches to Slack.
 */
export async function sendPendingMatchesDigest(): Promise<void> {
  // Fetch all pending matches
  const { data: pendingMatches, error } = await supabase
    .from("pending_matches")
    .select(
      "id, content_id, content_table, extracted_name, suggested_match_id, similarity_score, created_at",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !pendingMatches || pendingMatches.length === 0) {
    console.log("No pending matches to report.");
    return;
  }

  // Group by extracted_name for cleaner output
  const grouped = new Map<string, typeof pendingMatches>();
  for (const match of pendingMatches) {
    const existing = grouped.get(match.extracted_name) || [];
    existing.push(match);
    grouped.set(match.extracted_name, existing);
  }

  // Format Slack message
  const lines: string[] = [
    `:mag: *Dagelijks overzicht: ongematchte entiteiten*`,
    `Er staan *${pendingMatches.length} items* zonder projectkoppeling — wil je ze toewijzen?`,
    "",
  ];

  for (const [name, matches] of grouped) {
    const count = matches.length;
    const tables = [...new Set(matches.map((m) => m.content_table))].join(", ");
    lines.push(`• *"${name}"* — ${count}x gevonden in: ${tables}`);

    // Show suggested match if available
    const withSuggestion = matches.find((m) => m.suggested_match_id);
    if (withSuggestion && withSuggestion.similarity_score) {
      lines.push(`  └ Mogelijke match (similarity: ${withSuggestion.similarity_score.toFixed(2)})`);
    }
  }

  lines.push("");
  lines.push("_Koppel via MCP: `get_pending_matches()` → toewijzen_");

  // Post to Slack via webhook
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) {
    console.error("SLACK_WEBHOOK_URL not set — cannot send digest");
    return;
  }

  await fetch(slackWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: lines.join("\n"),
    }),
  });

  console.log(`Sent digest with ${pendingMatches.length} pending matches to Slack.`);
}
```

**Create the Edge Function `supabase/functions/pending-matches-digest/index.ts`:**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Verify authorization
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch pending matches
  const { data: pendingMatches } = await supabase
    .from("pending_matches")
    .select(
      "id, content_id, content_table, extracted_name, suggested_match_id, similarity_score, created_at",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (!pendingMatches || pendingMatches.length === 0) {
    return new Response(JSON.stringify({ sent: false, reason: "no_pending_matches" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Group by extracted_name
  const grouped = new Map<string, typeof pendingMatches>();
  for (const match of pendingMatches) {
    const existing = grouped.get(match.extracted_name) || [];
    existing.push(match);
    grouped.set(match.extracted_name, existing);
  }

  // Format Slack message
  const lines: string[] = [
    `:mag: *Dagelijks overzicht: ongematchte entiteiten*`,
    `Er staan *${pendingMatches.length} items* zonder projectkoppeling — wil je ze toewijzen?`,
    "",
  ];

  for (const [name, matches] of grouped) {
    const count = matches.length;
    const tables = [...new Set(matches.map((m: any) => m.content_table))].join(", ");
    lines.push(`• *"${name}"* — ${count}x gevonden in: ${tables}`);
  }

  lines.push("");
  lines.push("_Koppel via MCP: `get_pending_matches()` → toewijzen_");

  // Post to Slack
  const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
  if (slackWebhookUrl) {
    await fetch(slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lines.join("\n") }),
    });
  }

  return new Response(JSON.stringify({ sent: true, count: pendingMatches.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

**Schedule via pg_cron (daily at 09:00):**

```sql
SELECT cron.schedule(
    'pending-matches-digest',
    '0 9 * * *',    -- every day at 09:00
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT.supabase.co/functions/v1/pending-matches-digest',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
            'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
);
```

Deploy: `supabase functions deploy pending-matches-digest --no-verify-jwt`

**Set the Slack webhook URL:**

```bash
supabase secrets set SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...
```

---

## Verification

- [ ] Entity resolution: exact name match returns correct project_id
- [ ] Entity resolution: alias match (e.g., "HalalBox" matches project with alias "halalbox") works
- [ ] Entity resolution: embedding match with similarity > 0.85 returns project_id and adds alias automatically
- [ ] Entity resolution: no match creates entry in `pending_matches` table
- [ ] Decisions appear in `decisions` table with correct `project_id` and `source_id` (meeting)
- [ ] Action items appear in `action_items` table with `scope`, `project_id`, `assignee`, `due_date`
- [ ] Meeting record is updated with `project_id` when a match is found
- [ ] Content with no project match is saved with `project_id: null` (not lost)
- [ ] Daily digest: Slack message lists unmatched entities with counts
- [ ] pg_cron job for digest appears in `SELECT * FROM cron.job WHERE jobname = 'pending-matches-digest';`

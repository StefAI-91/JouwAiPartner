# Sprint 07: Impact Check / Conflict-detectie

**Phase:** V1 — Data Pipeline
**Requirements:** REQ-605, REQ-607
**Depends on:** Sprint 05 (Gatekeeper extracts decisions), Sprint 06 (entity resolution + data saved to tables)
**Produces:** Conflict detection that compares new decisions against existing content, creates update_suggestions, and notifies via Slack. The system NEVER modifies documentation itself — it signals and suggests.

---

## Task 1: Detect conflicts between new decisions and existing content

**What:** When the Gatekeeper extracts a decision (in Sprint 05), embed it and compare against existing decisions and meetings using vector similarity. If similar content exists with different conclusions, flag it as a potential conflict.

Based on PRD Stap 8: the embedding of a new decision is compared against `decisions` and `meetings` tables. Similarity > 0.8 triggers conflict analysis.

**Create `src/lib/impact-check.ts`:**

```typescript
import { createClient } from "@supabase/supabase-js";
import { embedText } from "./embeddings";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface ConflictResult {
  has_conflict: boolean;
  conflicts: {
    target_id: string;
    target_table: string;
    target_content: string;
    similarity: number;
  }[];
}

/**
 * Check a new decision against existing content for potential conflicts.
 *
 * Flow from PRD Stap 8:
 * 1. Embed the new decision text
 * 2. Search existing decisions and meetings for high similarity (> 0.8)
 * 3. If similar content exists with different conclusions → potential conflict
 */
export async function checkForConflicts(
  decisionText: string,
  sourceId: string, // the meeting that produced this decision
  threshold: number = 0.8,
): Promise<ConflictResult> {
  const embedding = await embedText(decisionText);
  const conflicts: ConflictResult["conflicts"] = [];

  // ── Search existing decisions ──
  const { data: similarDecisions, error: decError } = await supabase.rpc("match_decisions", {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: 5,
  });

  if (!decError && similarDecisions) {
    for (const match of similarDecisions) {
      // Skip self-matches (decisions from the same meeting)
      if (match.source_id === sourceId) continue;

      conflicts.push({
        target_id: match.id,
        target_table: "decisions",
        target_content: match.decision,
        similarity: match.similarity,
      });
    }
  }

  // ── Search existing meetings (summary) ──
  const { data: similarMeetings, error: meetError } = await supabase.rpc("match_meetings", {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: 5,
  });

  if (!meetError && similarMeetings) {
    for (const match of similarMeetings) {
      // Skip the source meeting itself
      if (match.id === sourceId) continue;

      conflicts.push({
        target_id: match.id,
        target_table: "meetings",
        target_content: match.summary || match.title,
        similarity: match.similarity,
      });
    }
  }

  return {
    has_conflict: conflicts.length > 0,
    conflicts,
  };
}
```

**Required RPC functions (add to Sprint 03 migration or create here):**

```sql
-- Match against decisions table
CREATE OR REPLACE FUNCTION match_decisions(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.8,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    decision TEXT,
    source_id UUID,
    made_by TEXT,
    date TIMESTAMP,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.decision,
        d.source_id,
        d.made_by,
        d.date,
        1 - (d.embedding <=> query_embedding) AS similarity
    FROM decisions d
    WHERE d.status = 'active'
      AND d.embedding IS NOT NULL
      AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Match against meetings table
CREATE OR REPLACE FUNCTION match_meetings(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.8,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    summary TEXT,
    date TIMESTAMP,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.title,
        m.summary,
        m.date,
        1 - (m.embedding <=> query_embedding) AS similarity
    FROM meetings m
    WHERE m.status = 'active'
      AND m.embedding IS NOT NULL
      AND 1 - (m.embedding <=> query_embedding) > match_threshold
    ORDER BY m.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
```

---

## Task 2: Create entries in update_suggestions table

**What:** When a conflict is detected, create an entry in `update_suggestions` with the target content, trigger source, current content, suggested new content, and reason.

**Add to `src/lib/impact-check.ts`:**

```typescript
/**
 * Create update suggestions for detected conflicts.
 * These are human-reviewable suggestions — the system NEVER auto-modifies.
 */
export async function createUpdateSuggestions(
  newDecisionText: string,
  triggerSourceId: string, // meeting ID that triggered this
  triggerSourceType: string, // 'meeting'
  conflicts: ConflictResult["conflicts"],
): Promise<number> {
  let created = 0;

  for (const conflict of conflicts) {
    await supabase.from("update_suggestions").insert({
      target_content_id: conflict.target_id,
      target_table: conflict.target_table,
      trigger_source_id: triggerSourceId,
      trigger_source_type: triggerSourceType,
      current_content: conflict.target_content,
      new_content: newDecisionText,
      reason: `Nieuw besluit uit meeting conflicteert mogelijk met bestaande ${conflict.target_table === "decisions" ? "beslissing" : "meeting-inhoud"} (similarity: ${conflict.similarity.toFixed(3)}).`,
      status: "pending",
    });
    created++;
  }

  return created;
}

/**
 * Full impact check pipeline for a single decision.
 * Called after saving a decision in Sprint 06.
 */
export async function runImpactCheck(
  decisionText: string,
  meetingId: string,
): Promise<{ conflicts_found: number; suggestions_created: number }> {
  // Check for conflicts
  const conflictResult = await checkForConflicts(decisionText, meetingId);

  if (!conflictResult.has_conflict) {
    return { conflicts_found: 0, suggestions_created: 0 };
  }

  // Create update suggestions
  const suggestionsCreated = await createUpdateSuggestions(
    decisionText,
    meetingId,
    "meeting",
    conflictResult.conflicts,
  );

  // Notify via Slack
  await notifyConflictToSlack(decisionText, meetingId, conflictResult.conflicts);

  return {
    conflicts_found: conflictResult.conflicts.length,
    suggestions_created: suggestionsCreated,
  };
}
```

---

## Task 3: Post conflict notification to Slack

**What:** When a conflict is detected, immediately notify via Slack with actionable context. The message includes what the new decision is, what it conflicts with, and a call to review.

**Add to `src/lib/impact-check.ts`:**

```typescript
/**
 * Send conflict notification to Slack.
 * Message format from PRD:
 * "Nieuw besluit uit meeting X conflicteert mogelijk met bestaande documentatie Y. Review nodig."
 */
async function notifyConflictToSlack(
  newDecisionText: string,
  meetingId: string,
  conflicts: ConflictResult["conflicts"],
): Promise<void> {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) {
    console.error("SLACK_WEBHOOK_URL not set — cannot send conflict notification");
    return;
  }

  // Fetch meeting title for context
  const { data: meeting } = await supabase
    .from("meetings")
    .select("title, date")
    .eq("id", meetingId)
    .single();

  const meetingTitle = meeting?.title || "Onbekende meeting";
  const meetingDate = meeting?.date
    ? new Date(meeting.date).toLocaleDateString("nl-NL")
    : "onbekende datum";

  // Build conflict details
  const conflictLines = conflicts.map((c) => {
    const typeLabel = c.target_table === "decisions" ? "beslissing" : "meeting";
    const preview =
      c.target_content.length > 100 ? c.target_content.slice(0, 100) + "..." : c.target_content;
    return `  • ${typeLabel}: "${preview}" (similarity: ${c.similarity.toFixed(2)})`;
  });

  const message = [
    `:warning: *Conflict gedetecteerd*`,
    "",
    `*Nieuw besluit* uit meeting "${meetingTitle}" (${meetingDate}):`,
    `> ${newDecisionText}`,
    "",
    `*Conflicteert mogelijk met:*`,
    ...conflictLines,
    "",
    `_Review nodig. Bekijk via MCP of in de database._`,
  ].join("\n");

  await fetch(slackWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });

  console.log(`Conflict notification sent to Slack for meeting ${meetingId}`);
}
```

**Integrate into the extraction pipeline (in `save-extractions.ts`):**

```typescript
import { runImpactCheck } from "./impact-check";

// After saving decisions in saveExtractions():
for (const decision of gatekeeperResult.decisions) {
  // ... insert decision into decisions table ...

  // Run impact check for each new decision
  const impactResult = await runImpactCheck(decision.decision, meetingId);
  if (impactResult.conflicts_found > 0) {
    console.log(
      `Impact check: ${impactResult.conflicts_found} conflicts found, ` +
        `${impactResult.suggestions_created} suggestions created`,
    );
  }
}
```

**IMPORTANT design principle from PRD:** The system NEVER modifies documentation itself. It:

1. Detects potential conflicts via embedding similarity
2. Creates entries in `update_suggestions` table
3. Notifies humans via Slack
4. Humans decide whether to accept or reject the suggestion

**Example flow from PRD:**

```
Nieuw besluit: "Onboarding flow wordt 2 stappen"
        ↓
Embedding-search tegen bestaande content
        ↓
Hit gevonden met hoge similarity (>0.8):
  "Onboarding flow bestaat uit 3 stappen" (PRD-HalalBox)
        ↓
Conflict gedetecteerd (hoge similarity + afwijkende inhoud)
        ↓
Entry in update_suggestions tabel:
  - target: PRD-HalalBox
  - trigger: meeting 27-03
  - huidige inhoud: "3 stappen"
  - suggestie: "2 stappen (besloten in meeting 27-03)"
        ↓
Notificatie naar Slack
```

---

## Verification

- [ ] `checkForConflicts()` returns conflicts when a similar decision exists (similarity > 0.8)
- [ ] `checkForConflicts()` does NOT return the source meeting itself as a conflict (self-match filter works)
- [ ] `update_suggestions` table receives entries with: target_content_id, target_table, trigger_source_id, current_content, new_content, reason
- [ ] Slack notification is sent with Dutch message format: "Nieuw besluit uit meeting X conflicteert mogelijk met..."
- [ ] `match_decisions` RPC function works correctly
- [ ] `match_meetings` RPC function works correctly
- [ ] Impact check runs automatically after each decision is saved
- [ ] System never auto-modifies existing content — only creates suggestions
- [ ] Suggestions have status = 'pending' by default

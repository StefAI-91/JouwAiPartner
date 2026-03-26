# Sprint 05: Gatekeeper Agent (v1)

**Phase:** 1 — Foundation
**Requirements:** REQ-107, REQ-600, REQ-601, REQ-602, REQ-603, REQ-604, REQ-607
**Depends on:** Sprint 02 (content_reviews table), Sprint 04 (content flows into pipeline)
**Produces:** AI filter that scores, classifies, and routes all incoming content

---

## Task 1: Build Gatekeeper with Vercel AI SDK

**What:** Single-pass agent using `generateObject()` with Claude Haiku. Takes raw content, returns a typed scoring/classification object.

**Create `src/lib/agents/gatekeeper.ts`:**
```typescript
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

// Typed output schema — the Gatekeeper MUST return this shape
const GatekeeperSchema = z.object({
  relevance_score: z
    .number()
    .min(0)
    .max(1)
    .describe("How business-relevant is this content? 0 = noise, 1 = critical"),
  categories: z
    .array(
      z.enum(["decision", "context", "action_item", "reference", "insight"])
    )
    .describe("One or more content categories that apply"),
  sensitivity: z
    .enum(["open", "restricted"])
    .describe("open = visible to all, restricted = HR/salary/legal/NDA content"),
  action: z
    .enum(["admit", "quarantine", "reject"])
    .describe("What to do with this content based on the relevance score"),
  reason: z
    .string()
    .describe("Brief explanation of the scoring decision (1-2 sentences)"),
  extracted_topics: z
    .array(z.string())
    .describe("Key topics/themes mentioned in this content"),
});

export type GatekeeperResult = z.infer<typeof GatekeeperSchema>;

const SYSTEM_PROMPT = `You are the Gatekeeper agent for a company knowledge platform. Your job is to evaluate incoming content and decide whether it should be admitted to the knowledge base.

Score content on a 0.0 to 1.0 scale:
- 0.0–0.3: REJECT. Chit-chat, spam, irrelevant noise, greetings, social messages.
- 0.3–0.6: QUARANTINE. Might be useful but unclear. Flag for human review.
- 0.6–1.0: ADMIT. Clear business value — decisions, context, action items, insights.

Set the action field based on the score:
- score < 0.3 → "reject"
- score 0.3–0.6 → "quarantine"
- score > 0.6 → "admit"

For sensitivity:
- Default to "open" — most content should be accessible to all teams.
- Set "restricted" ONLY for: HR discussions, salary/compensation, legal matters, client-confidential under NDA, personal employee issues.

Classify into one or more categories. A piece of content can be both a "decision" and an "action_item" if it contains both.

Be strict about noise but err on the side of keeping uncertain content (quarantine, don't reject).`;

export async function runGatekeeper(
  content: string,
  metadata: {
    source: "meeting" | "document" | "slack" | "email";
    title?: string;
    author?: string;
    channel?: string;
  }
): Promise<GatekeeperResult> {
  const contextPrefix = [
    `Source: ${metadata.source}`,
    metadata.title ? `Title: ${metadata.title}` : null,
    metadata.author ? `Author: ${metadata.author}` : null,
    metadata.channel ? `Channel: ${metadata.channel}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    schema: GatekeeperSchema,
    system: SYSTEM_PROMPT,
    prompt: `${contextPrefix}\n\nContent to evaluate:\n\n${content}`,
  });

  return object;
}
```

**Key technical details:**
- `generateObject()` uses tool use under the hood with Anthropic — it forces the model to return valid JSON matching the Zod schema
- `.describe()` on each field guides the model's output — these become part of the tool description
- Claude Haiku is fast (~200-500ms per call) and cheap (~$0.0001 per classification)
- The schema guarantees you never get malformed output — no JSON parsing errors

---

## Task 2: Implement routing logic

**What:** Process the Gatekeeper result: insert content with correct status, or reject it.

**Create `src/lib/agents/gatekeeper-pipeline.ts`:**
```typescript
import { createClient } from "@supabase/supabase-js";
import { runGatekeeper, GatekeeperResult } from "./gatekeeper";
import { embedText } from "../embeddings";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ContentInput {
  table: "documents" | "meetings" | "slack_messages" | "emails";
  data: Record<string, any>;       // row data to insert
  contentField: string;             // which field contains the text to evaluate
  metadata: {
    source: "meeting" | "document" | "slack" | "email";
    title?: string;
    author?: string;
    channel?: string;
  };
}

/**
 * Run content through the Gatekeeper and insert into DB with appropriate status.
 * Returns the Gatekeeper result and the inserted row ID (or null if rejected).
 */
export async function processContent(
  input: ContentInput
): Promise<{ result: GatekeeperResult; rowId: string | null }> {
  const textToEvaluate = input.data[input.contentField];

  // Run Gatekeeper
  const result = await runGatekeeper(textToEvaluate, input.metadata);

  // Map action to status
  const statusMap = {
    admit: "active",
    quarantine: "quarantined",
    reject: null, // don't insert
  } as const;

  const status = statusMap[result.action];
  let rowId: string | null = null;

  if (status) {
    // Generate embedding for admitted/quarantined content
    const embedding = result.action === "admit"
      ? await embedText(textToEvaluate)
      : null; // don't waste embedding cost on quarantined content

    const { data, error } = await supabase
      .from(input.table)
      .insert({
        ...input.data,
        relevance_score: result.relevance_score,
        status,
        category: result.categories,
        sensitivity: result.sensitivity,
        embedding: embedding as any,
        embedding_stale: !embedding, // stale if we didn't embed
      })
      .select("id")
      .single();

    if (!error && data) {
      rowId = data.id;
    }
  }

  // Log the decision (Task 3)
  await logGatekeeperDecision(rowId, input.table, result);

  return { result, rowId };
}
```

**Routing logic:**
| Score | Action | DB Status | Embedding? |
|---|---|---|---|
| 0.0–0.3 | `reject` | Not inserted | No |
| 0.3–0.6 | `quarantine` | `quarantined` | No (save cost, embed on promote) |
| 0.6–1.0 | `admit` | `active` | Yes (immediate) |

**Why skip embedding for quarantined:** saves cost since most quarantined content will either be promoted (and embedded then) or auto-rejected after 30 days.

---

## Task 3: Log Gatekeeper decisions to audit trail

**What:** Every Gatekeeper decision (admit, reject, quarantine) is logged to `content_reviews` for transparency and tuning.

```typescript
async function logGatekeeperDecision(
  contentId: string | null,
  contentTable: string,
  result: GatekeeperResult
): Promise<void> {
  await supabase.from("content_reviews").insert({
    content_id: contentId || "00000000-0000-0000-0000-000000000000",
    content_table: contentTable,
    agent_role: "gatekeeper",
    action: result.action === "admit" ? "admitted" : result.action === "quarantine" ? "quarantined" : "rejected",
    reason: result.reason,
    metadata: {
      relevance_score: result.relevance_score,
      categories: result.categories,
      sensitivity: result.sensitivity,
      extracted_topics: result.extracted_topics,
    },
  });
}
```

**Now update the Fireflies webhook to use the Gatekeeper pipeline:**

In `supabase/functions/fireflies-webhook/index.ts`, replace the direct insert with:
```typescript
// Instead of direct supabase.from("meetings").insert(...)
// Call the Gatekeeper pipeline:
const { result, rowId } = await processContent({
  table: "meetings",
  data: {
    fireflies_id: meetingId,
    title: transcript.title,
    date: transcript.date,
    participants: transcript.participants,
    summary: transcript.summary?.overview || "",
    action_items: transcript.summary?.action_items || [],
    transcript: chunks.map((c) => c.text).join("\n\n---\n\n"),
  },
  contentField: "summary",  // Gatekeeper evaluates the summary, not full transcript
  metadata: {
    source: "meeting",
    title: transcript.title,
  },
});
```

**Why evaluate the summary, not the full transcript:** The summary is a concise representation. Evaluating the full transcript would be slow and expensive (Haiku input tokens). The summary captures the meeting's value.

---

## Verification

- [ ] `runGatekeeper()` returns a valid typed object matching `GatekeeperSchema`
- [ ] Score < 0.3 content gets rejected (not inserted)
- [ ] Score 0.3-0.6 content gets quarantined (inserted without embedding)
- [ ] Score > 0.6 content gets admitted (inserted with embedding)
- [ ] Every decision appears in `content_reviews` with reason and metadata
- [ ] Fireflies webhook now routes through Gatekeeper before insert
- [ ] Test with real examples: business meeting summary (should admit), casual chat (should reject)

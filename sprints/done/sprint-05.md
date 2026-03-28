# Sprint 05: Gatekeeper + Extractie (Combined)

**Phase:** V1 — Data Pipeline
**Requirements:** REQ-107, REQ-600–REQ-607, REQ-1600–REQ-1604
**Depends on:** Sprint 03 (embedding utility), Sprint 04 (content flows into pipeline via Fireflies webhook)
**Produces:** Combined AI filter + extraction agent that scores, classifies, and extracts structured data in a single Haiku call. Novelty check for duplicate detection.

---

## Task 1: Build combined Gatekeeper+Extraction agent

**What:** The v1 PRD combines Gatekeeper scoring AND structured extraction into a SINGLE Haiku call using `generateObject()`. This replaces the separate Gatekeeper and Extractor from the old sprint plan. One API call does both filtering and extraction.

**IMPORTANT:** No quarantine concept in v1. Only `pass` (score >= 0.6) or `reject` (score < 0.6).

**Create `src/lib/agents/gatekeeper.ts`:**

```typescript
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

// ── Full output schema from the PRD (GatekeeperOutput interface) ──

const GatekeeperSchema = z.object({
  // Beoordeling
  relevance_score: z
    .number()
    .min(0)
    .max(1)
    .describe("How business-relevant is this content? 0.0 = noise, 1.0 = critical"),
  action: z.enum(["pass", "reject"]).describe("pass if relevance_score >= 0.6, reject if < 0.6"),
  reason: z.string().describe("Brief explanation of the scoring decision (one sentence)"),
  category: z
    .array(z.enum(["decision", "context", "action_item", "reference", "insight"]))
    .describe("One or more content categories that apply"),

  // Entiteiten
  entities: z.object({
    people: z.array(z.string()).describe("People mentioned by name"),
    projects: z.array(z.string()).describe("Projects discussed"),
    clients: z.array(z.string()).describe("Clients mentioned"),
    topics: z.array(z.string()).describe("Key topics/themes"),
  }),

  // Geëxtraheerde data
  decisions: z
    .array(
      z.object({
        decision: z.string().describe("What was concretely decided"),
        made_by: z.string().describe("Who made or announced the decision"),
      }),
    )
    .describe("Concrete decisions made in the meeting"),

  action_items: z
    .array(
      z.object({
        description: z.string().describe("What needs to be done"),
        assignee: z.string().describe("Who is responsible"),
        deadline: z
          .string()
          .nullable()
          .describe("Due date if mentioned (ISO format or natural language)"),
        scope: z
          .enum(["project", "personal"])
          .describe("project if related to a project, personal otherwise"),
        project: z.string().nullable().describe("Project name if scope is project"),
      }),
    )
    .describe("Action items with assignee and optional deadline"),

  project_updates: z
    .array(
      z.object({
        project: z.string().describe("Project name"),
        status: z.string().describe("Current status or update"),
        blockers: z.array(z.string()).describe("Any blockers mentioned"),
      }),
    )
    .describe("Status updates for projects discussed"),

  strategy_ideas: z.array(z.string()).describe("New strategic directions or brainstorm ideas"),

  client_info: z
    .array(
      z.object({
        client: z.string().describe("Client name"),
        note: z.string().describe("What was said about or on behalf of this client"),
      }),
    )
    .describe("Information about or from clients"),
});

export type GatekeeperOutput = z.infer<typeof GatekeeperSchema>;

// ── Gatekeeper prompt from the PRD (Dutch, meeting-specific) ──

const SYSTEM_PROMPT = `Je ontvangt een meeting transcript. Beoordeel en extraheer het volgende:

BEOORDELING:
- Relevantie-score (0.0 - 1.0)
- Actie: pass (≥0.6) of reject (<0.6)

EXTRACTIE:
1. BESLUITEN — wat is er concreet besloten? Door wie?
2. ACTIEPUNTEN — wie doet wat, voor wanneer?
   - Koppel aan een project als het projectgerelateerd is
   - Markeer als "persoonlijk" als het niet bij een project hoort
3. PROJECTUPDATES — welke projecten zijn besproken, wat is de status?
4. STRATEGIE & IDEEËN — nieuwe richtingen of brainstorms?
5. KLANTINFO — wat is er gezegd over of namens klanten?

ENTITEITEN:
- Personen die worden genoemd
- Projecten die worden besproken
- Klanten die ter sprake komen
- Onderwerpen/thema's

Wees streng bij de beoordeling: alleen inhoud met duidelijke bedrijfswaarde krijgt score >= 0.6.
Small talk, greetings en irrelevante gesprekken krijgen een lage score.
Als je twijfelt over extractie, laat het veld leeg in plaats van te gokken.`;

/**
 * Run the combined Gatekeeper+Extraction agent.
 * Single Haiku call that both scores and extracts structured data.
 */
export async function runGatekeeper(
  content: string,
  metadata: {
    title?: string;
    participants?: string[];
    date?: string;
  },
): Promise<GatekeeperOutput> {
  const contextPrefix = [
    metadata.title ? `Titel: ${metadata.title}` : null,
    metadata.participants?.length ? `Deelnemers: ${metadata.participants.join(", ")}` : null,
    metadata.date ? `Datum: ${metadata.date}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    schema: GatekeeperSchema,
    system: SYSTEM_PROMPT,
    prompt: `${contextPrefix}\n\nTranscript:\n\n${content}`,
  });

  return object;
}
```

**Key technical details:**

- `generateObject()` uses tool use under the hood with Anthropic — forces the model to return valid JSON matching the Zod schema
- `.describe()` on each field guides the model's output — these become part of the tool description
- Claude Haiku is fast (~200-500ms per call) and cheap (~$0.001 per classification+extraction)
- The schema guarantees you never get malformed output — no JSON parsing errors
- ONE call replaces what used to be two (Gatekeeper + Extractor)

---

## Task 2: Implement routing logic

**What:** Process the Gatekeeper result: score >= 0.6 means pass (insert), score < 0.6 means reject (don't insert). Log ALL decisions to content_reviews.

**Create `src/lib/agents/gatekeeper-pipeline.ts`:**

```typescript
import { createClient } from "@supabase/supabase-js";
import { runGatekeeper, GatekeeperOutput } from "./gatekeeper";
import { embedText } from "../embeddings";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface MeetingInput {
  fireflies_id: string;
  title: string;
  date: string;
  participants: string[];
  summary: string;
  transcript: string;
}

/**
 * Run a meeting through the Gatekeeper pipeline.
 * Returns the Gatekeeper result and the inserted meeting ID (or null if rejected).
 */
export async function processMeeting(
  input: MeetingInput,
): Promise<{ result: GatekeeperOutput; meetingId: string | null }> {
  // Run combined Gatekeeper + Extraction
  const result = await runGatekeeper(input.transcript, {
    title: input.title,
    participants: input.participants,
    date: input.date,
  });

  let meetingId: string | null = null;

  if (result.action === "pass") {
    // Score >= 0.6 → insert the meeting
    const { data, error } = await supabase
      .from("meetings")
      .insert({
        fireflies_id: input.fireflies_id,
        title: input.title,
        date: input.date,
        participants: input.participants,
        summary: input.summary,
        transcript: input.transcript,
        relevance_score: result.relevance_score,
        status: "active",
        category: result.category,
        embedding_stale: true, // re-embedding worker handles this
      })
      .select("id")
      .single();

    if (!error && data) {
      meetingId = data.id;
    }
  }
  // If result.action === "reject" → don't insert. Content is not stored.

  // Log the decision to content_reviews (always, for audit trail)
  await logGatekeeperDecision(meetingId, result);

  return { result, meetingId };
}

/**
 * Log every Gatekeeper decision for transparency and tuning.
 */
async function logGatekeeperDecision(
  contentId: string | null,
  result: GatekeeperOutput,
): Promise<void> {
  await supabase.from("content_reviews").insert({
    content_id: contentId || "00000000-0000-0000-0000-000000000000",
    content_table: "meetings",
    agent_role: "gatekeeper",
    action: result.action === "pass" ? "admitted" : "rejected",
    reason: result.reason,
    metadata: {
      relevance_score: result.relevance_score,
      category: result.category,
      entities: result.entities,
      decisions_count: result.decisions.length,
      action_items_count: result.action_items.length,
    },
  });
}
```

**Routing logic (simplified for v1):**
| Score | Action | DB Status | Embedding? |
|---|---|---|---|
| < 0.6 | `reject` | Not inserted | No |
| >= 0.6 | `pass` | `active` | Yes (via re-embed worker) |

**No quarantine in v1.** Content either passes or gets rejected. This simplifies the pipeline significantly.

**Update the Fireflies webhook to use the Gatekeeper pipeline:**

In `supabase/functions/fireflies-webhook/index.ts`, replace the direct insert with:

```typescript
// Instead of direct supabase.from("meetings").insert(...)
// Call the Gatekeeper pipeline:
const { result, meetingId } = await processMeeting({
  fireflies_id: meetingId,
  title: transcript.title,
  date: transcript.date,
  participants: transcript.participants,
  summary: transcript.summary?.overview || "",
  transcript: chunks.map((c) => c.text).join("\n\n---\n\n"),
});

// If passed, the extracted data will be saved in Sprint 06
```

---

## Task 3: Novelty check (embedding similarity > 0.92 = duplicate)

**What:** Before inserting content, check if semantically similar content already exists. This runs BEFORE the database insert to prevent duplicates.

**Add to `src/lib/agents/gatekeeper-pipeline.ts`:**

```typescript
/**
 * Check if content is too similar to existing entries.
 * Returns true if content is novel (should proceed), false if duplicate.
 */
async function isNovel(
  text: string,
  threshold: number = 0.92,
): Promise<{ novel: boolean; similarId?: string; similarity?: number }> {
  // Generate embedding for the new content
  const embedding = await embedText(text);

  // Search for similar content in meetings table
  const { data, error } = await supabase.rpc("search_all_content", {
    query_embedding: embedding as any,
    match_threshold: threshold,
    match_count: 1,
  });

  if (error || !data || data.length === 0) {
    return { novel: true };
  }

  return {
    novel: false,
    similarId: data[0].id,
    similarity: data[0].similarity,
  };
}
```

**Integrate into processMeeting(), before insert:**

```typescript
// In processMeeting(), after Gatekeeper returns "pass" but before insert:
if (result.action === "pass") {
  // Novelty check — reject duplicates
  const noveltyCheck = await isNovel(input.summary);

  if (!noveltyCheck.novel) {
    // Content is a duplicate — reject it
    await logGatekeeperDecision(null, {
      ...result,
      action: "reject",
      reason: `Duplicate detected. Similar to existing entry ${noveltyCheck.similarId} (similarity: ${noveltyCheck.similarity?.toFixed(3)})`,
    });
    return { result: { ...result, action: "reject" }, meetingId: null };
  }

  // Proceed with insert...
}
```

**Why 0.92 threshold:**

- 0.95+ = essentially identical text (too strict, misses paraphrases)
- 0.90 = very similar content (might catch legitimately related but different content)
- 0.92 = sweet spot: catches real duplicates while allowing related-but-distinct content

---

## Verification

- [ ] `runGatekeeper()` returns a valid typed object matching the full `GatekeeperSchema` (relevance_score, action, entities, decisions, action_items, project_updates, strategy_ideas, client_info)
- [ ] Score < 0.6 content gets rejected (not inserted into meetings table)
- [ ] Score >= 0.6 content gets passed (inserted with status = 'active')
- [ ] Novelty check: submitting the same transcript twice results in duplicate rejection
- [ ] Every decision appears in `content_reviews` with reason and metadata
- [ ] Fireflies webhook now routes through Gatekeeper before insert
- [ ] Test with real examples: business meeting (should pass), casual chat (should reject)
- [ ] Extraction output includes decisions, action_items with scope, entities, project_updates
- [ ] No quarantine status anywhere — only pass/reject

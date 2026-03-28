# Sprint 04: Fireflies Webhook + Pre-filter

**Phase:** V1 — Data Pipeline
**Requirements:** REQ-103, REQ-200, REQ-201, REQ-204
**Depends on:** Sprint 02 (meetings table), Sprint 03 (embedding utility)
**Produces:** Real-time meeting ingestion from Fireflies with rule-based pre-filtering that saves 60-70% API costs

---

## Task 1: Create Fireflies webhook Edge Function

**What:** Supabase Edge Function that receives the Fireflies webhook POST when a transcription completes. Fetches the full transcript via GraphQL.

**Create `supabase/functions/fireflies-webhook/index.ts`:**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FIREFLIES_API = "https://api.fireflies.ai/graphql";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  // Parse webhook payload
  const payload = await req.json();
  // Fireflies sends: { meetingId: "abc123", eventType: "Transcription completed" }
  const { meetingId, eventType } = payload;

  if (eventType !== "Transcription completed" || !meetingId) {
    return new Response(JSON.stringify({ skipped: true }), { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Pre-filter: duplicate check (idempotency) ──
  const { data: existing } = await supabase
    .from("meetings")
    .select("id")
    .eq("fireflies_id", meetingId)
    .single();

  if (existing) {
    return new Response(JSON.stringify({ skipped: true, reason: "duplicate_meeting_id" }), {
      status: 200,
    });
  }

  // Fetch full transcript from Fireflies GraphQL API
  const transcript = await fetchFirefliesTranscript(meetingId);

  if (!transcript) {
    return new Response(JSON.stringify({ error: "Failed to fetch transcript" }), { status: 500 });
  }

  // ── Pre-filter: duration check ──
  const durationMinutes = calculateDurationMinutes(transcript.sentences);
  if (durationMinutes < 2) {
    console.log(`Pre-filter: rejected ${meetingId} — duration ${durationMinutes}min < 2min`);
    return new Response(
      JSON.stringify({ skipped: true, reason: "too_short", duration: durationMinutes }),
      { status: 200 },
    );
  }

  // ── Pre-filter: participants check ──
  if (!transcript.participants || transcript.participants.length === 0) {
    console.log(`Pre-filter: rejected ${meetingId} — no participants`);
    return new Response(JSON.stringify({ skipped: true, reason: "no_participants" }), {
      status: 200,
    });
  }

  // Chunk the transcript
  const chunks = chunkTranscript(transcript.sentences);

  // Store as meeting record — Gatekeeper will process in Sprint 05
  // For now, insert directly with embedding_stale = true
  const { error } = await supabase.from("meetings").insert({
    fireflies_id: meetingId,
    title: transcript.title,
    date: transcript.date,
    participants: transcript.participants,
    summary: transcript.summary?.overview || "",
    transcript: chunks.map((c) => c.text).join("\n\n---\n\n"),
    embedding_stale: true,
    status: "active",
  });

  return new Response(JSON.stringify({ success: !error, meetingId, error }), {
    status: error ? 500 : 200,
    headers: { "Content-Type": "application/json" },
  });
});
```

Deploy: `supabase functions deploy fireflies-webhook --no-verify-jwt`

**Register in Fireflies:** Go to Fireflies Dashboard > Settings > Developer > Webhooks > add your Edge Function URL:
`https://YOUR_PROJECT.supabase.co/functions/v1/fireflies-webhook`

---

## Task 2: Pre-filter (rules, no AI)

**What:** Simple rule-based filters that run BEFORE any AI call, saving 60-70% API costs. Three rules from the PRD:

1. Test-calls shorter than 2 minutes → reject
2. Meetings without participants → reject
3. Duplicate meeting_id → reject (idempotency)

These are integrated directly into the webhook handler above. Here are the helper functions:

```typescript
/**
 * Calculate meeting duration from sentences array.
 * Returns duration in minutes.
 */
function calculateDurationMinutes(sentences: { start_time: number; end_time: number }[]): number {
  if (!sentences || sentences.length === 0) return 0;

  const firstStart = sentences[0].start_time;
  const lastEnd = sentences[sentences.length - 1].end_time;

  // Fireflies times are in seconds
  return (lastEnd - firstStart) / 60;
}

/**
 * Pre-filter result type for logging/debugging.
 */
interface PreFilterResult {
  passed: boolean;
  reason?: "too_short" | "no_participants" | "duplicate_meeting_id";
  details?: Record<string, any>;
}

/**
 * Run all pre-filter checks. Returns whether the meeting should proceed.
 * Note: duplicate check runs separately (before GraphQL fetch) for efficiency.
 */
function runPreFilter(transcript: FirefliesTranscript): PreFilterResult {
  // Rule 1: Duration < 2 minutes
  const duration = calculateDurationMinutes(transcript.sentences);
  if (duration < 2) {
    return {
      passed: false,
      reason: "too_short",
      details: { duration_minutes: duration },
    };
  }

  // Rule 2: No participants
  if (!transcript.participants || transcript.participants.length === 0) {
    return {
      passed: false,
      reason: "no_participants",
    };
  }

  return { passed: true };
}
```

**Why pre-filter matters:**

- A typical Fireflies account has many test calls, accidental recordings, and short check-ins
- Each Gatekeeper call costs ~$0.001 (Haiku input tokens)
- Pre-filtering 60-70% of junk saves $5-15/month at scale
- No AI needed — these are deterministic rules

---

## Task 3: Fetch transcript via Fireflies GraphQL API + chunk transcript

**What:** GraphQL query to fetch full transcript data including sentences, summary, and action items. Plus chunking for meaningful embeddings.

```typescript
const FIREFLIES_API_KEY = Deno.env.get("FIREFLIES_API_KEY")!;

interface FirefliesTranscript {
  id: string;
  title: string;
  date: string;
  participants: string[];
  summary: {
    overview: string;
    action_items: string[];
    shorthand_bullet: string[];
    keywords: string[];
  };
  sentences: {
    index: number;
    text: string;
    speaker_name: string;
    start_time: number;
    end_time: number;
  }[];
}

async function fetchFirefliesTranscript(meetingId: string): Promise<FirefliesTranscript | null> {
  const query = `
    query Transcript($id: String!) {
      transcript(id: $id) {
        id
        title
        date
        participants
        summary {
          overview
          action_items
          shorthand_bullet
          keywords
        }
        sentences {
          index
          text
          speaker_name
          start_time
          end_time
        }
      }
    }
  `;

  const response = await fetch(FIREFLIES_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FIREFLIES_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      variables: { id: meetingId },
    }),
  });

  const result = await response.json();
  return result.data?.transcript || null;
}
```

**Set the API key:**

```bash
supabase secrets set FIREFLIES_API_KEY=your-key-here
```

**Transcript chunking:**

```typescript
interface TranscriptChunk {
  text: string;
  speakers: string[];
  startTime: number;
  endTime: number;
  tokenEstimate: number;
}

const TARGET_CHUNK_TOKENS = 600; // target ~600 tokens per chunk
const MAX_CHUNK_TOKENS = 800; // hard max
const CHARS_PER_TOKEN = 4; // rough estimate

function chunkTranscript(
  sentences: {
    text: string;
    speaker_name: string;
    start_time: number;
    end_time: number;
  }[],
): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = [];
  let currentChunk: typeof sentences = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = Math.ceil(sentence.text.length / CHARS_PER_TOKEN);

    // Start new chunk if adding this sentence exceeds max
    if (currentTokens + sentenceTokens > MAX_CHUNK_TOKENS && currentChunk.length > 0) {
      chunks.push(buildChunk(currentChunk));
      // Keep last sentence as overlap for context continuity
      currentChunk = [currentChunk[currentChunk.length - 1]];
      currentTokens = Math.ceil(currentChunk[0].text.length / CHARS_PER_TOKEN);
    }

    currentChunk.push(sentence);
    currentTokens += sentenceTokens;

    // If we hit the target and there's a natural speaker change, break
    if (
      currentTokens >= TARGET_CHUNK_TOKENS &&
      currentChunk.length > 1 &&
      sentence.speaker_name !== sentences[sentences.indexOf(sentence) + 1]?.speaker_name
    ) {
      chunks.push(buildChunk(currentChunk));
      currentChunk = [sentence]; // overlap
      currentTokens = sentenceTokens;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push(buildChunk(currentChunk));
  }

  return chunks;
}

function buildChunk(
  sentences: {
    text: string;
    speaker_name: string;
    start_time: number;
    end_time: number;
  }[],
): TranscriptChunk {
  const text = sentences.map((s) => `${s.speaker_name}: ${s.text}`).join("\n");

  const speakers = [...new Set(sentences.map((s) => s.speaker_name))];

  return {
    text,
    speakers,
    startTime: sentences[0].start_time,
    endTime: sentences[sentences.length - 1].end_time,
    tokenEstimate: Math.ceil(text.length / CHARS_PER_TOKEN),
  };
}
```

**Chunking strategy:**

- Target: ~600 tokens per chunk (sweet spot for embedding quality)
- Hard max: 800 tokens (OpenAI allows 8,191 but shorter chunks = better retrieval)
- Break on speaker changes when near target (natural topic boundaries)
- Overlap: last sentence of previous chunk starts the next chunk (preserves context)

**Gotchas:**

- Fireflies rate limits: ~50 requests/minute on standard plans
- `sentences` can be very large for long meetings (2+ hours = thousands of sentences)
- `date` comes as a Unix timestamp string from Fireflies — may need conversion

---

## Verification

- [ ] Webhook endpoint responds to POST with Fireflies payload shape
- [ ] Pre-filter: meeting shorter than 2 minutes is rejected (not sent to Gatekeeper)
- [ ] Pre-filter: meeting without participants is rejected
- [ ] Pre-filter: duplicate `meetingId` is rejected (idempotency check)
- [ ] GraphQL query returns full transcript with sentences, summary, action items
- [ ] Chunking produces chunks of ~500-800 tokens
- [ ] Meeting row appears in `meetings` table with `embedding_stale = true`
- [ ] Re-embedding worker (from Sprint 03) picks it up and generates embedding

# Sprint 04: Fireflies Webhook Ingestion

**Phase:** 1 — Foundation
**Requirements:** REQ-103, REQ-200, REQ-201, REQ-204
**Depends on:** Sprint 02 (meetings table), Sprint 03 (embedding utility)
**Produces:** Real-time meeting ingestion from Fireflies

---

## Task 1: Create Fireflies webhook Edge Function

**What:** Supabase Edge Function that receives the Fireflies webhook POST when a transcription completes.

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
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Check idempotency — skip if already processed
  const { data: existing } = await supabase
    .from("meetings")
    .select("id")
    .eq("fireflies_id", meetingId)
    .single();

  if (existing) {
    return new Response(JSON.stringify({ skipped: true, reason: "duplicate" }), {
      status: 200,
    });
  }

  // Fetch full transcript from Fireflies GraphQL API
  const transcript = await fetchFirefliesTranscript(meetingId);

  if (!transcript) {
    return new Response(JSON.stringify({ error: "Failed to fetch transcript" }), {
      status: 500,
    });
  }

  // Chunk the transcript
  const chunks = chunkTranscript(transcript.sentences);

  // Store as meeting record (the Gatekeeper will process it in Sprint 05)
  // For now, insert directly with embedding_stale = true
  const { error } = await supabase.from("meetings").insert({
    fireflies_id: meetingId,
    title: transcript.title,
    date: transcript.date,
    participants: transcript.participants,
    summary: transcript.summary?.overview || "",
    action_items: transcript.summary?.action_items || [],
    transcript: chunks.map((c) => c.text).join("\n\n---\n\n"),
    embedding_stale: true, // re-embedding worker will handle this
    status: "active",
  });

  return new Response(
    JSON.stringify({ success: !error, meetingId, error }),
    { status: error ? 500 : 200, headers: { "Content-Type": "application/json" } }
  );
});
```

Deploy: `supabase functions deploy fireflies-webhook --no-verify-jwt`

**Register in Fireflies:** Go to Fireflies Dashboard > Settings > Developer > Webhooks > add your Edge Function URL:
`https://YOUR_PROJECT.supabase.co/functions/v1/fireflies-webhook`

---

## Task 2: Fetch transcript via Fireflies GraphQL API

**What:** GraphQL query to fetch full transcript data including sentences, summary, and action items.

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

async function fetchFirefliesTranscript(
  meetingId: string
): Promise<FirefliesTranscript | null> {
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

**Gotchas:**
- Fireflies rate limits: ~50 requests/minute on standard plans
- `sentences` can be very large for long meetings (2+ hours = thousands of sentences)
- `date` comes as a Unix timestamp string from Fireflies — may need conversion

---

## Task 3: Chunk transcript by topic segments

**What:** Split long transcripts into semantic chunks of ~500-800 tokens for meaningful embeddings.

```typescript
interface TranscriptChunk {
  text: string;
  speakers: string[];
  startTime: number;
  endTime: number;
  tokenEstimate: number;
}

const TARGET_CHUNK_TOKENS = 600;  // target ~600 tokens per chunk
const MAX_CHUNK_TOKENS = 800;     // hard max
const CHARS_PER_TOKEN = 4;        // rough estimate

function chunkTranscript(
  sentences: {
    text: string;
    speaker_name: string;
    start_time: number;
    end_time: number;
  }[]
): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = [];
  let currentChunk: typeof sentences = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = Math.ceil(sentence.text.length / CHARS_PER_TOKEN);

    // Start new chunk if adding this sentence exceeds max
    if (
      currentTokens + sentenceTokens > MAX_CHUNK_TOKENS &&
      currentChunk.length > 0
    ) {
      chunks.push(buildChunk(currentChunk));
      // Keep last sentence as overlap for context continuity
      currentChunk = [currentChunk[currentChunk.length - 1]];
      currentTokens = Math.ceil(
        currentChunk[0].text.length / CHARS_PER_TOKEN
      );
    }

    currentChunk.push(sentence);
    currentTokens += sentenceTokens;

    // If we hit the target and there's a natural speaker change, break
    if (
      currentTokens >= TARGET_CHUNK_TOKENS &&
      currentChunk.length > 1 &&
      sentence.speaker_name !==
        sentences[sentences.indexOf(sentence) + 1]?.speaker_name
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
  }[]
): TranscriptChunk {
  const text = sentences
    .map((s) => `${s.speaker_name}: ${s.text}`)
    .join("\n");

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

---

## Verification

- [ ] Webhook endpoint responds to POST with Fireflies payload shape
- [ ] Duplicate `meetingId` is rejected (idempotency check)
- [ ] GraphQL query returns full transcript with sentences, summary, action items
- [ ] Chunking produces chunks of ~500-800 tokens
- [ ] Meeting row appears in `meetings` table with `embedding_stale = true`
- [ ] Re-embedding worker (from Sprint 03) picks it up and generates embedding

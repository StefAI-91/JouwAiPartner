# Sprint 07: Fireflies Polling Fallback

**Phase:** 1 — Foundation
**Requirements:** REQ-202, REQ-106
**Depends on:** Sprint 04 (Fireflies webhook pipeline)
**Produces:** Resilient ingestion that catches missed webhooks

---

## Task 1: Build polling function

**What:** Query Fireflies `transcripts` endpoint to find unprocessed meetings. Compare against what's already in the `meetings` table.

**Create `supabase/functions/fireflies-poll/index.ts`:**
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FIREFLIES_API = "https://api.fireflies.ai/graphql";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const apiKey = Deno.env.get("FIREFLIES_API_KEY")!;

  // Fetch recent transcripts from Fireflies (last 24 hours)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const query = `
    query RecentTranscripts {
      transcripts {
        id
        title
        date
      }
    }
  `;

  const response = await fetch(FIREFLIES_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query }),
  });

  const result = await response.json();
  const transcripts = result.data?.transcripts || [];

  // Filter to recent transcripts only
  const recentTranscripts = transcripts.filter(
    (t: any) => new Date(t.date) > new Date(since)
  );

  // Check which ones we already have
  const { data: existing } = await supabase
    .from("meetings")
    .select("fireflies_id")
    .in(
      "fireflies_id",
      recentTranscripts.map((t: any) => t.id)
    );

  const existingIds = new Set(existing?.map((e) => e.fireflies_id) || []);
  const missing = recentTranscripts.filter(
    (t: any) => !existingIds.has(t.id)
  );

  // Process missing transcripts by calling the webhook handler
  for (const transcript of missing) {
    // Call the existing webhook Edge Function to process each missing meeting
    await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/fireflies-webhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          meetingId: transcript.id,
          eventType: "Transcription completed",
        }),
      }
    );
  }

  return new Response(
    JSON.stringify({
      checked: recentTranscripts.length,
      missing: missing.length,
      processed: missing.map((t: any) => t.id),
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
```

**Key detail:** The polling function reuses the existing webhook handler — it simply calls it with the same payload shape. This avoids duplicating ingestion logic.

---

## Task 2: Schedule polling via pg_cron

**What:** Run the polling fallback every 30 minutes.

```sql
SELECT cron.schedule(
    'fireflies-poll-fallback',
    '*/30 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT.supabase.co/functions/v1/fireflies-poll',
        headers := jsonb_build_object(
            'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
            'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
);
```

Deploy: `supabase functions deploy fireflies-poll --no-verify-jwt`

---

## Task 3: Verify idempotency

**What:** Ensure that even if polling finds an already-processed meeting, it doesn't create duplicates.

The idempotency is already handled in Sprint 04's webhook handler:
```typescript
// This check in fireflies-webhook/index.ts prevents duplicates:
const { data: existing } = await supabase
  .from("meetings")
  .select("id")
  .eq("fireflies_id", meetingId)
  .single();

if (existing) {
  return new Response(JSON.stringify({ skipped: true, reason: "duplicate" }));
}
```

**Test scenario:**
1. Meeting arrives via webhook → processed normally
2. Polling runs 30 minutes later → finds the same meeting
3. Webhook handler checks `fireflies_id` → already exists → skips

---

## Verification

- [ ] Polling function lists recent Fireflies transcripts
- [ ] Already-processed meetings are skipped (idempotency works)
- [ ] Missing meetings are processed through the full pipeline (Gatekeeper → extraction)
- [ ] pg_cron job runs every 30 minutes: `SELECT * FROM cron.job WHERE jobname = 'fireflies-poll-fallback';`
- [ ] No duplicate meetings in `meetings` table after both webhook and polling run

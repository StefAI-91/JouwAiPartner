# Sprint 16: Fireflies Polling Fallback

**Phase:** V2 — Toegang & Kwaliteit
**Requirements:** REQ-206
**Depends on:** Sprint 04 (Fireflies webhook ingestion)
**Produces:** Polling function that catches any meetings missed by the webhook

---

## Task 1: Build polling Edge Function

**What:** Query the Fireflies GraphQL API for recent transcripts and compare against the meetings table to find any that were missed by the webhook.

**Create `supabase/functions/fireflies-poll/index.ts`:**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FIREFLIES_API = "https://api.fireflies.ai/graphql";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const apiKey = Deno.env.get("FIREFLIES_API_KEY")!;

  // Query Fireflies for transcripts from the last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const query = `
    query {
      transcripts(limit: 50) {
        id
        title
        date
        duration
        participants
        sentences {
          speaker_name
          text
        }
        summary {
          overview
          action_items
          keywords
        }
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

  const { data } = await response.json();
  const transcripts = data?.transcripts || [];

  // Filter to last 24 hours
  const recentTranscripts = transcripts.filter(
    (t: any) => new Date(t.date).getTime() > Date.now() - 24 * 60 * 60 * 1000,
  );

  let processed = 0;
  let skipped = 0;

  for (const transcript of recentTranscripts) {
    // Check if this meeting already exists in our database
    const { data: existing } = await supabase
      .from("meetings")
      .select("id")
      .eq("fireflies_id", transcript.id)
      .single();

    if (existing) {
      skipped++;
      continue;
    }

    // Meeting was missed by webhook — process it through the existing handler
    // Invoke the fireflies-webhook function with the meeting ID
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/fireflies-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        meetingId: transcript.id,
        eventType: "Transcription completed",
      }),
    });

    processed++;
  }

  return new Response(
    JSON.stringify({
      total_recent: recentTranscripts.length,
      processed,
      skipped,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
```

Deploy: `supabase functions deploy fireflies-poll --no-verify-jwt`

---

## Task 2: Schedule polling via pg_cron

**What:** Run the polling function every 30 minutes to catch any missed webhooks.

```sql
SELECT cron.schedule(
    'fireflies-poll-fallback',
    '*/30 * * * *',    -- every 30 minutes
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

---

## Task 3: Monitoring and logging

**What:** Track polling results so we know if the webhook is reliably delivering.

```typescript
// Add at the end of the polling function, before returning:
await supabase.from("metrics").insert({
  metric_name: "fireflies_poll",
  metric_value: {
    total_recent: recentTranscripts.length,
    processed,
    skipped,
    polled_at: new Date().toISOString(),
  },
});
```

**If the polling function consistently finds missed meetings (processed > 0), investigate the webhook configuration.** The polling fallback is a safety net, not the primary ingestion path.

---

## Verification

- [ ] Polling function queries Fireflies API for last 24 hours of transcripts
- [ ] Already-ingested meetings are skipped (idempotency via `fireflies_id` check)
- [ ] Missed meetings are processed through the existing webhook handler
- [ ] pg_cron job runs every 30 minutes: `SELECT * FROM cron.job WHERE jobname = 'fireflies-poll-fallback';`
- [ ] Polling results are logged to the metrics table
- [ ] No duplicate meetings are created when webhook and polling both fire

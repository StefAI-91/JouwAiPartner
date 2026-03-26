# Sprint 13: Slack Ingestion Setup

**Phase:** 2 — Expand Sources & Agents
**Requirements:** REQ-400, REQ-401, REQ-402, REQ-408
**Depends on:** Sprint 05 (Gatekeeper pipeline)
**Produces:** Slack Events API connected, messages flowing to our endpoint

---

## Task 1: Create Slack App and configure events

**What:** Set up a Slack App with the right scopes and event subscriptions.

**Steps:**
1. Go to [api.slack.com/apps](https://api.slack.com/apps) → Create New App → From Scratch
2. Name: "Knowledge Platform" | Workspace: your workspace

3. **OAuth & Permissions** → Add scopes:
   - `channels:history` — read messages in public channels
   - `channels:read` — list channels
   - `groups:history` — read messages in private channels
   - `groups:read` — list private channels
   - `users:read` — resolve user IDs to names

4. **Event Subscriptions** → Enable Events
   - Request URL: `https://YOUR_PROJECT.supabase.co/functions/v1/slack-webhook`
   - Subscribe to bot events:
     - `message.channels` — messages in public channels
     - `message.groups` — messages in private channels

5. **Install App** to workspace → copy Bot User OAuth Token (`xoxb-...`)

6. **Invite the bot** to each channel you want to monitor:
   ```
   /invite @Knowledge Platform
   ```

**Store token:**
```bash
supabase secrets set SLACK_BOT_TOKEN=xoxb-your-token
supabase secrets set SLACK_SIGNING_SECRET=your-signing-secret
```

---

## Task 2: Build Slack webhook Edge Function

**What:** Receive Slack events, verify authenticity, respond within 3 seconds, queue processing.

**Create `supabase/functions/slack-webhook/index.ts`:**
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std/crypto/mod.ts";

Deno.serve(async (req) => {
  const body = await req.text();
  const payload = JSON.parse(body);

  // Handle Slack URL verification challenge
  if (payload.type === "url_verification") {
    return new Response(JSON.stringify({ challenge: payload.challenge }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify request signature (security)
  const timestamp = req.headers.get("x-slack-request-timestamp");
  const signature = req.headers.get("x-slack-signature");
  const signingSecret = Deno.env.get("SLACK_SIGNING_SECRET")!;

  const baseString = `v0:${timestamp}:${body}`;
  const hmac = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", hmac, new TextEncoder().encode(baseString));
  const computed = `v0=${Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("")}`;

  if (computed !== signature) {
    return new Response("Invalid signature", { status: 401 });
  }

  // RESPOND IMMEDIATELY (Slack requires <3 seconds)
  // Queue the actual processing asynchronously
  if (payload.type === "event_callback") {
    const event = payload.event;

    // Only process message events
    if (event.type === "message" && !event.subtype) {
      // Queue for processing (fire and forget)
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Store raw event in a queue table for async processing
      await supabase.from("event_queue").insert({
        source: "slack",
        event_id: payload.event_id,
        payload: event,
        status: "pending",
      });
    }
  }

  return new Response("OK", { status: 200 });
});
```

**Create event queue table:**
```sql
CREATE TABLE event_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    event_id TEXT UNIQUE,     -- for idempotency
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'done', 'failed'
    attempts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

CREATE INDEX idx_event_queue_status ON event_queue(status, created_at);
```

Deploy: `supabase functions deploy slack-webhook --no-verify-jwt`

**Why a queue:** Slack's 3-second deadline means we can't do Gatekeeper scoring, extraction, and embedding inline. We accept the event instantly and process it asynchronously.

---

## Task 3: Build event processor

**What:** Background worker that picks up pending Slack events from the queue and processes them.

**Create `supabase/functions/process-events/index.ts`:**
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fetch pending events
  const { data: events } = await supabase
    .from("event_queue")
    .select("*")
    .eq("status", "pending")
    .eq("source", "slack")
    .order("created_at", { ascending: true })
    .limit(20);

  if (!events || events.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }));
  }

  let processed = 0;

  for (const event of events) {
    // Mark as processing
    await supabase
      .from("event_queue")
      .update({ status: "processing", attempts: event.attempts + 1 })
      .eq("id", event.id);

    try {
      // Process the Slack message (thread aggregation is Sprint 14)
      // For now, just pass single messages through the pipeline
      const slackEvent = event.payload;

      // Resolve user name
      const userName = await resolveSlackUser(slackEvent.user);

      // This will be enhanced in Sprint 14 with thread aggregation
      // For now, basic single-message processing
      await processContent({
        table: "slack_messages",
        data: {
          channel: slackEvent.channel,
          thread_id: slackEvent.thread_ts || slackEvent.ts,
          author: userName,
          content: slackEvent.text,
          slack_event_id: event.event_id,
          timestamp: new Date(parseFloat(slackEvent.ts) * 1000).toISOString(),
        },
        contentField: "content",
        metadata: {
          source: "slack",
          author: userName,
          channel: slackEvent.channel,
        },
      });

      await supabase
        .from("event_queue")
        .update({ status: "done", processed_at: new Date().toISOString() })
        .eq("id", event.id);

      processed++;
    } catch (err) {
      await supabase
        .from("event_queue")
        .update({ status: event.attempts >= 3 ? "failed" : "pending" })
        .eq("id", event.id);
    }
  }

  return new Response(JSON.stringify({ processed }));
});

async function resolveSlackUser(userId: string): Promise<string> {
  const res = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
    headers: { Authorization: `Bearer ${Deno.env.get("SLACK_BOT_TOKEN")}` },
  });
  const data = await res.json();
  return data.user?.real_name || data.user?.name || userId;
}
```

**Schedule processor via pg_cron (every minute):**
```sql
SELECT cron.schedule(
    'process-slack-events',
    '* * * * *',
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT.supabase.co/functions/v1/process-events',
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

## Verification

- [ ] Slack URL verification challenge succeeds (Events API activates)
- [ ] Request signature validation works (rejects tampered requests)
- [ ] Webhook responds within 3 seconds (always — processing is queued)
- [ ] Duplicate `event_id` is rejected (idempotency via UNIQUE constraint)
- [ ] Events appear in `event_queue` with status 'pending'
- [ ] Processor picks up pending events and routes through Gatekeeper
- [ ] Failed events retry up to 3 times, then marked 'failed'
- [ ] Bot is in the monitored channels and receiving events

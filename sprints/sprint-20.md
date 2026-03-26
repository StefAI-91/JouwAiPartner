# Sprint 20: Slack Socket Mode + Event Replay

**Phase:** 2 — Expand Sources & Agents
**Requirements:** REQ-409, REQ-1502, REQ-1503
**Depends on:** Sprint 13 (Slack ingestion, event_queue table)
**Produces:** Dev-friendly Slack connection + resilient event processing

---

## Task 1: Slack Socket Mode for development

**What:** WebSocket-based Slack connection that works without a public URL. Use for local development and testing.

**Create `src/lib/slack-socket.ts`:**
```typescript
import { WebSocket } from "ws";

// Get an App-Level Token from api.slack.com → Your App → Basic Information → App-Level Tokens
// Create token with scope: connections:write

export async function startSocketMode(appToken: string, onEvent: (event: any) => void) {
  // Open a WebSocket connection
  const connRes = await fetch("https://slack.com/api/apps.connections.open", {
    method: "POST",
    headers: { Authorization: `Bearer ${appToken}` },
  });
  const { url } = await connRes.json();

  const ws = new WebSocket(url);

  ws.on("message", (data: string) => {
    const payload = JSON.parse(data);

    // Acknowledge the event (required)
    if (payload.envelope_id) {
      ws.send(JSON.stringify({ envelope_id: payload.envelope_id }));
    }

    // Process the event
    if (payload.type === "events_api" && payload.payload?.event) {
      onEvent(payload.payload.event);
    }
  });

  ws.on("close", () => {
    console.log("Socket Mode disconnected, reconnecting in 5s...");
    setTimeout(() => startSocketMode(appToken, onEvent), 5000);
  });

  console.log("Slack Socket Mode connected");
}
```

**Usage in dev:**
```typescript
// dev-only script: scripts/slack-dev.ts
startSocketMode(process.env.SLACK_APP_TOKEN!, async (event) => {
  // Insert into event_queue just like the webhook does
  await supabase.from("event_queue").insert({
    source: "slack",
    event_id: event.event_ts,
    payload: event,
    status: "pending",
  });
});
```

**Slack App setup:** Enable Socket Mode in your app settings → generate an App-Level Token with `connections:write` scope.

---

## Task 2: Event replay for failed events

**What:** Ability to re-process failed events from the queue.

**Create API route `src/app/api/events/replay/route.ts`:**
```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { event_ids, source, status_filter } = await req.json();
  const supabase = await createClient();

  let query = supabase
    .from("event_queue")
    .update({ status: "pending", attempts: 0 })
    .eq("status", status_filter || "failed");

  if (event_ids) query = query.in("id", event_ids);
  if (source) query = query.eq("source", source);

  const { data, error, count } = await query.select("id");

  return NextResponse.json({
    replayed: data?.length || 0,
    error: error?.message,
  });
}
```

**Replay all failed Slack events:**
```bash
curl -X POST http://localhost:3000/api/events/replay \
  -H "Content-Type: application/json" \
  -d '{"source": "slack", "status_filter": "failed"}'
```

---

## Task 3: Agent independence verification

**What:** Verify each agent can be stopped and restarted without affecting others.

**Test checklist:**
- [ ] Stop the Curator cron job → Gatekeeper still processes new content
- [ ] Stop the event processor → Slack events queue up in `event_queue`, nothing lost
- [ ] Restart the event processor → queued events are processed
- [ ] Stop the re-embedding worker → content is ingested with `embedding_stale=true`, worker catches up on restart
- [ ] Stop the MCP server → agents still run, just can't query. Restart restores querying.

**Each component is independent because:**
- All communication goes through the database
- No direct agent-to-agent calls
- Event queue acts as a buffer
- `embedding_stale` flag acts as a deferred work queue

---

## Verification

- [ ] Socket Mode connects and receives Slack events locally (no public URL needed)
- [ ] Events from Socket Mode are processed identically to Events API webhooks
- [ ] Failed events can be replayed via API endpoint
- [ ] Replayed events go through the full pipeline (Gatekeeper, extraction)
- [ ] Each agent/worker can be stopped and restarted independently
- [ ] No data loss when any single component is temporarily down

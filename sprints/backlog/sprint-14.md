# Sprint 14: Slack Thread Aggregation

**Phase:** V2 — Toegang & Kwaliteit
**Requirements:** REQ-403, REQ-404, REQ-405, REQ-406, REQ-407
**Depends on:** Sprint 13 (Slack events flowing to queue)
**Produces:** Threads ingested as coherent knowledge units, pre-filters applied

---

## Task 1: Thread-aware message processing

**What:** Instead of processing individual messages, detect threads and aggregate them.

**Update the event processor to handle threads:**

```typescript
async function processSlackEvent(event: any, supabase: any): Promise<void> {
  const slackToken = Deno.env.get("SLACK_BOT_TOKEN")!;

  // Pre-filters — skip before any processing
  if (shouldSkipMessage(event)) return;

  const isThreadReply = !!event.thread_ts && event.thread_ts !== event.ts;
  const threadTs = event.thread_ts || event.ts;

  if (isThreadReply) {
    // This is a reply in a thread — fetch the FULL thread and replace
    const threadRes = await fetch(
      `https://slack.com/api/conversations.replies?channel=${event.channel}&ts=${threadTs}`,
      { headers: { Authorization: `Bearer ${slackToken}` } },
    );
    const threadData = await threadRes.json();
    const messages = threadData.messages || [];

    // Build aggregated thread content
    const threadContent = await buildThreadContent(messages);

    // Delete existing entry for this thread (if any)
    await supabase
      .from("slack_messages")
      .delete()
      .eq("thread_id", threadTs)
      .eq("channel", event.channel);

    // Re-insert the full thread through Gatekeeper
    await processContent({
      table: "slack_messages",
      data: {
        channel: event.channel,
        thread_id: threadTs,
        author: threadContent.participants.join(", "),
        content: threadContent.text,
        timestamp: new Date(parseFloat(threadTs) * 1000).toISOString(),
      },
      contentField: "content",
      metadata: {
        source: "slack",
        channel: event.channel,
      },
    });
  } else {
    // New top-level message — hold for 5 minutes to see if a thread develops
    // Queue with a 5-minute delay
    await supabase.from("event_queue").insert({
      source: "slack_delayed",
      event_id: `delayed_${event.ts}`,
      payload: event,
      status: "pending",
      created_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min future
    });
  }
}

async function buildThreadContent(
  messages: any[],
): Promise<{ text: string; participants: string[] }> {
  const participants = new Set<string>();
  const lines: string[] = [];

  for (const msg of messages) {
    const userName = await resolveSlackUser(msg.user);
    participants.add(userName);
    lines.push(`${userName}: ${msg.text}`);
  }

  return {
    text: lines.join("\n"),
    participants: [...participants],
  };
}
```

**Delayed message processor** — modify the event processor to check `created_at`:

```typescript
// Only fetch events whose created_at is in the past (respects the 5-min delay)
const { data: events } = await supabase
  .from("event_queue")
  .select("*")
  .eq("status", "pending")
  .in("source", ["slack", "slack_delayed"])
  .lte("created_at", new Date().toISOString()) // only process if delay has passed
  .order("created_at", { ascending: true })
  .limit(20);
```

---

## Task 2: Pre-filters

**What:** Rule-based filters that skip noise before any AI processing.

```typescript
// List of channels to exclude (configurable)
const EXCLUDED_CHANNELS: string[] = []; // populate during setup

function shouldSkipMessage(event: any): boolean {
  // Skip bot messages
  if (event.bot_id || event.subtype === "bot_message") return true;

  // Skip message subtypes that aren't real content
  const skipSubtypes = [
    "channel_join",
    "channel_leave",
    "channel_topic",
    "channel_purpose",
    "channel_name",
    "pinned_item",
  ];
  if (event.subtype && skipSubtypes.includes(event.subtype)) return true;

  // Skip reactions (these come as separate events)
  if (event.type === "reaction_added" || event.type === "reaction_removed") return true;

  // Skip very short messages (< 20 chars)
  if (!event.text || event.text.length < 20) return true;

  // Skip excluded channels
  if (EXCLUDED_CHANNELS.includes(event.channel)) return true;

  // Skip messages that are just links, emoji, or mentions
  const textWithoutMentions = event.text.replace(/<[^>]+>/g, "").trim();
  if (textWithoutMentions.length < 10) return true;

  return false;
}
```

---

## Task 3: Handle delayed top-level messages

**What:** After the 5-minute hold, check if the message became a thread. If yes, skip (the thread handler will process it). If no, process as a standalone message.

```typescript
async function processDelayedMessage(event: any, supabase: any): Promise<void> {
  const slackToken = Deno.env.get("SLACK_BOT_TOKEN")!;

  // Check if this message now has replies (became a thread)
  const threadRes = await fetch(
    `https://slack.com/api/conversations.replies?channel=${event.channel}&ts=${event.ts}&limit=2`,
    { headers: { Authorization: `Bearer ${slackToken}` } },
  );
  const threadData = await threadRes.json();

  if (threadData.messages && threadData.messages.length > 1) {
    // It became a thread — skip, thread aggregation will handle it
    return;
  }

  // It's still a standalone message — process it
  const userName = await resolveSlackUser(event.user);
  await processContent({
    table: "slack_messages",
    data: {
      channel: event.channel,
      thread_id: event.ts,
      author: userName,
      content: event.text,
      timestamp: new Date(parseFloat(event.ts) * 1000).toISOString(),
    },
    contentField: "content",
    metadata: {
      source: "slack",
      author: userName,
      channel: event.channel,
    },
  });
}
```

---

## Verification

- [ ] Thread replies trigger full thread re-fetch and re-insert (not individual messages)
- [ ] Top-level messages are held for 5 minutes before processing
- [ ] Messages that become threads within 5 minutes are skipped (handled by thread aggregation)
- [ ] Bot messages, reactions, and short messages are filtered out
- [ ] Excluded channels are skipped
- [ ] Thread content shows all participants and the full conversation
- [ ] Updated threads (new reply) replace the previous version in DB

# Sprint 23: Dispatcher Agent

**Phase:** 3 — Insights & Delivery
**Requirements:** REQ-900–REQ-903
**Depends on:** Sprint 22 (insights table populated by Analyst)
**Produces:** Automatic routing of insights and alerts to Slack and email

---

## Task 1: Build Dispatcher — Slack routing

**What:** Watch for new insights and post them to relevant Slack channels.

**Create `src/lib/agents/dispatcher.ts`:**
```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN!;

// Topic-to-channel routing map (configurable)
const CHANNEL_ROUTING: Record<string, string> = {
  engineering: "C_ENGINEERING_ID",
  sales: "C_SALES_ID",
  product: "C_PRODUCT_ID",
  general: "C_GENERAL_ID",
};

const DEFAULT_CHANNEL = "C_GENERAL_ID";

export async function dispatchInsights(): Promise<number> {
  // Fetch undispatched insights
  const { data: insights } = await supabase
    .from("insights")
    .select("*")
    .eq("dispatched", false)
    .order("created_at", { ascending: true });

  if (!insights || insights.length === 0) return 0;

  let dispatched = 0;

  for (const insight of insights) {
    // Determine target channel based on topic
    const channel = CHANNEL_ROUTING[insight.topic?.toLowerCase()] || DEFAULT_CHANNEL;

    // Format the Slack message
    const blocks = [
      {
        type: "header",
        text: { type: "plain_text", text: `Insight: ${insight.title}` },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: insight.body },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Topic: *${insight.topic || "General"}* | Generated: ${new Date(insight.created_at).toLocaleDateString()}`,
          },
        ],
      },
    ];

    // Post to Slack
    const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel,
        blocks,
        text: `Insight: ${insight.title}`, // fallback for notifications
      }),
    });

    const result = await slackRes.json();

    if (result.ok) {
      // Mark as dispatched
      await supabase
        .from("insights")
        .update({ dispatched: true })
        .eq("id", insight.id);
      dispatched++;
    }
  }

  return dispatched;
}
```

**Required Slack scopes:** Add `chat:write` to your Slack app's OAuth scopes and reinstall.

---

## Task 2: Email digest routing

**What:** Send email digests for insights that need broader distribution.

```typescript
// Using Resend, Postmark, or any transactional email service
// Example with Resend:
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Recipient routing (configurable)
const EMAIL_ROUTING: Record<string, string[]> = {
  leadership: ["ceo@company.com", "cto@company.com"],
  engineering: ["eng-team@company.com"],
  sales: ["sales-team@company.com"],
};

async function sendInsightEmail(insight: any): Promise<void> {
  const recipients = EMAIL_ROUTING[insight.topic?.toLowerCase()] || [];
  if (recipients.length === 0) return;

  await resend.emails.send({
    from: "Knowledge Platform <insights@company.com>",
    to: recipients,
    subject: `Insight: ${insight.title}`,
    html: `
      <h2>${insight.title}</h2>
      <p>${insight.body}</p>
      <hr>
      <p><small>Topic: ${insight.topic} | Generated: ${new Date(insight.created_at).toLocaleDateString()}</small></p>
      <p><small>View more insights in the <a href="${process.env.APP_URL}/insights">dashboard</a>.</small></p>
    `,
  });
}
```

**Add email dispatch to the main function:**
```typescript
export async function dispatchInsights(): Promise<number> {
  // ... existing Slack dispatch code ...

  for (const insight of insights) {
    // Slack dispatch (from Task 1)
    await postToSlack(insight);

    // Email dispatch
    await sendInsightEmail(insight);

    // Mark dispatched
    await supabase.from("insights").update({ dispatched: true }).eq("id", insight.id);
    dispatched++;
  }
  return dispatched;
}
```

---

## Task 3: Schedule Dispatcher

**What:** Run after the Analyst to dispatch new insights.

**API route + Edge Function (same pattern as Curator/Analyst):**

```sql
-- Run at 5:30 AM (30 min after Analyst)
SELECT cron.schedule(
    'dispatch-insights',
    '30 5 * * *',
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT.supabase.co/functions/v1/run-dispatcher',
        headers := jsonb_build_object('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'),
        body := '{}'::jsonb
    );
    $$
);

-- Also run every 15 minutes during work hours for real-time alerts
SELECT cron.schedule(
    'dispatch-realtime',
    '*/15 8-18 * * 1-5',    -- every 15 min, 8AM-6PM, Mon-Fri
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT.supabase.co/functions/v1/run-dispatcher',
        headers := jsonb_build_object('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'),
        body := '{}'::jsonb
    );
    $$
);
```

---

## Verification

- [ ] New insights in `insights` table are posted to the correct Slack channel
- [ ] Slack messages use Block Kit formatting (header, body, context)
- [ ] Email digests are sent to the correct recipients based on topic
- [ ] Insights are marked `dispatched = true` after successful delivery
- [ ] Failed dispatches are retried on the next run (not marked dispatched)
- [ ] Daily dispatch runs after Analyst, plus real-time during work hours

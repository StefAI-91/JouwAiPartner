# Sprint 21: Gmail Ingestion

**Phase:** 3 — Insights & Delivery
**Requirements:** REQ-500–REQ-506
**Depends on:** Sprint 05 (Gatekeeper pipeline), Sprint 10 (Google auth utility)
**Produces:** Real-time email ingestion via Google Cloud Pub/Sub

---

## Task 1: Set up Pub/Sub topic and Gmail watch

**What:** Create the Google Cloud Pub/Sub infrastructure for Gmail push notifications.

**Google Cloud Console steps:**
1. Enable **Gmail API** and **Cloud Pub/Sub API**
2. Create Pub/Sub topic: `projects/YOUR_PROJECT/topics/gmail-notifications`
3. Grant Publisher role to Gmail:
```bash
gcloud pubsub topics add-iam-policy-binding gmail-notifications \
  --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
  --role="roles/pubsub.publisher"
```
4. Create Pub/Sub push subscription pointing to your Edge Function:
```bash
gcloud pubsub subscriptions create gmail-push-sub \
  --topic=gmail-notifications \
  --push-endpoint=https://YOUR_PROJECT.supabase.co/functions/v1/gmail-webhook \
  --ack-deadline=60
```

**Start watching a user's inbox:**
```typescript
async function watchGmail(accessToken: string, userEmail: string): Promise<void> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${userEmail}/watch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topicName: "projects/YOUR_PROJECT/topics/gmail-notifications",
        labelIds: ["INBOX"],
        labelFilterAction: "include",
      }),
    }
  );
  const result = await response.json();
  // Store result.historyId and result.expiration for later use
  await supabase.from("system_config").upsert([
    { key: `gmail_history_${userEmail}`, value: result.historyId },
    { key: `gmail_watch_expiry_${userEmail}`, value: String(result.expiration) },
  ]);
}
```

**Schedule daily renewal (watch expires every 7 days):**
```sql
SELECT cron.schedule(
    'gmail-watch-renewal',
    '0 6 * * *',    -- daily at 6 AM
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT.supabase.co/functions/v1/gmail-renew',
        headers := jsonb_build_object('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'),
        body := '{}'::jsonb
    );
    $$
);
```

---

## Task 2: Build Gmail webhook and email fetching

**Create `supabase/functions/gmail-webhook/index.ts`:**
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken } from "../_shared/google-auth.ts";

Deno.serve(async (req) => {
  const body = await req.json();

  // Pub/Sub sends: { message: { data: base64, messageId, publishTime } }
  const data = JSON.parse(atob(body.message.data));
  // data = { emailAddress: "user@company.com", historyId: "12345" }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const userEmail = data.emailAddress;
  const accessToken = await getAccessToken(
    Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY")!,
    userEmail
  );

  // Get stored history ID
  const { data: config } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", `gmail_history_${userEmail}`)
    .single();

  const startHistoryId = config?.value;

  // Fetch history changes
  const historyRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${userEmail}/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded&labelId=INBOX`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const history = await historyRes.json();

  // Update stored history ID
  if (history.historyId) {
    await supabase.from("system_config").upsert({
      key: `gmail_history_${userEmail}`,
      value: history.historyId,
    });
  }

  // Process new messages
  const messageIds = new Set<string>();
  for (const record of history.history || []) {
    for (const msg of record.messagesAdded || []) {
      messageIds.add(msg.message.id);
    }
  }

  for (const messageId of messageIds) {
    await processEmail(accessToken, userEmail, messageId, supabase);
  }

  return new Response(JSON.stringify({ processed: messageIds.size }));
});

async function processEmail(accessToken: string, userEmail: string, messageId: string, supabase: any) {
  // Fetch full message
  const msgRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${userEmail}/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const message = await msgRes.json();

  // Extract headers
  const headers = message.payload.headers;
  const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
  const from = headers.find((h: any) => h.name === "From")?.value || "";
  const to = headers.find((h: any) => h.name === "To")?.value || "";
  const date = headers.find((h: any) => h.name === "Date")?.value || "";

  // Extract body (handle multipart)
  const body = extractBody(message.payload);

  // Pre-filter
  if (shouldSkipEmail(from, subject, body)) return;

  // Idempotency check
  const { data: existing } = await supabase
    .from("emails").select("id").eq("gmail_id", messageId).single();
  if (existing) return;

  // Process through Gatekeeper
  await processContent({
    table: "emails",
    data: {
      gmail_id: messageId,
      subject,
      sender: from,
      recipients: to.split(",").map((r: string) => r.trim()),
      body,
      thread_id: message.threadId,
      date: new Date(date).toISOString(),
    },
    contentField: "body",
    metadata: { source: "email", title: subject, author: from },
  });
}

function extractBody(payload: any): string {
  if (payload.body?.data) {
    return atob(payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
  }
  if (payload.parts) {
    const textPart = payload.parts.find((p: any) => p.mimeType === "text/plain");
    if (textPart?.body?.data) {
      return atob(textPart.body.data.replace(/-/g, "+").replace(/_/g, "/"));
    }
  }
  return "";
}

function shouldSkipEmail(from: string, subject: string, body: string): boolean {
  const lowerSubject = subject.toLowerCase();
  const lowerFrom = from.toLowerCase();

  // Skip newsletters
  if (lowerFrom.includes("noreply") || lowerFrom.includes("no-reply")) return true;
  if (lowerSubject.includes("unsubscribe")) return true;

  // Skip automated notifications
  if (lowerFrom.includes("notifications@") || lowerFrom.includes("mailer-daemon")) return true;

  // Skip very short emails
  if (body.length < 50) return true;

  return false;
}
```

---

## Task 3: Email chunking

**What:** One email = one chunk. Long email threads: each reply is a separate chunk with thread context in metadata.

The email body is typically short enough for a single chunk. For long threads, the `thread_id` field groups them. The MCP server can fetch all emails in a thread when needed.

No special chunking logic needed — emails are naturally chunked by message.

---

## Verification

- [ ] Pub/Sub topic created and Gmail has Publisher role
- [ ] `users.watch` subscription is active for target user(s)
- [ ] Push notification triggers email fetch via `history.list`
- [ ] historyId is stored and updated after each notification
- [ ] Newsletters, noreply, and short emails are pre-filtered
- [ ] Duplicate `gmail_id` is rejected (idempotency)
- [ ] Emails pass through Gatekeeper (scored, categorized, extracted)
- [ ] Daily renewal keeps the watch alive (7-day expiry)

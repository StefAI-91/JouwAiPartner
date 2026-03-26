# Sprint 12: Google Drive Watch Renewal

**Phase:** 2 — Expand Sources & Agents
**Requirements:** REQ-301, REQ-106
**Depends on:** Sprint 10 (Drive watch subscription active)
**Produces:** Auto-renewing Drive watch channel that never silently expires

---

## Task 1: Store channel info for renewal

**What:** Save the watch channel details so the renewal job knows what to renew.

```sql
-- Add to system_config or create a dedicated table
INSERT INTO system_config (key, value) VALUES
  ('drive_channel_id', ''),
  ('drive_channel_resource_id', ''),
  ('drive_channel_expiry', '');
```

**Update the subscription function from Sprint 10 to store channel info:**
```typescript
async function subscribeToDriveChanges(accessToken: string): Promise<void> {
  const tokenRes = await fetch(
    "https://www.googleapis.com/drive/v3/changes/startPageToken",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const { startPageToken } = await tokenRes.json();

  await supabase.from("system_config").upsert({
    key: "drive_page_token", value: startPageToken,
  });

  const channelId = crypto.randomUUID();
  const expiration = Date.now() + 23 * 60 * 60 * 1000; // 23 hours

  const watchRes = await fetch(
    `https://www.googleapis.com/drive/v3/changes/watch?pageToken=${startPageToken}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address: `${Deno.env.get("SUPABASE_URL")}/functions/v1/drive-webhook`,
        expiration,
      }),
    }
  );

  const channel = await watchRes.json();

  // Store channel details for renewal
  await supabase.from("system_config").upsert([
    { key: "drive_channel_id", value: channel.id },
    { key: "drive_channel_resource_id", value: channel.resourceId },
    { key: "drive_channel_expiry", value: String(channel.expiration) },
  ]);
}
```

---

## Task 2: Build renewal Edge Function

**What:** Edge Function that stops the old channel and creates a new subscription.

**Create `supabase/functions/drive-renew/index.ts`:**
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken } from "../_shared/google-auth.ts";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const accessToken = await getAccessToken(
    Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY")!,
    Deno.env.get("GOOGLE_ADMIN_EMAIL")!
  );

  // Stop the old channel
  const { data: configs } = await supabase
    .from("system_config")
    .select("key, value")
    .in("key", ["drive_channel_id", "drive_channel_resource_id", "drive_page_token"]);

  const configMap = Object.fromEntries(
    (configs || []).map((c) => [c.key, c.value])
  );

  if (configMap.drive_channel_id && configMap.drive_channel_resource_id) {
    await fetch("https://www.googleapis.com/drive/v3/channels/stop", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: configMap.drive_channel_id,
        resourceId: configMap.drive_channel_resource_id,
      }),
    });
  }

  // Get current page token (continue from where we left off)
  const pageToken = configMap.drive_page_token;

  // Create new subscription
  const channelId = crypto.randomUUID();
  const expiration = Date.now() + 23 * 60 * 60 * 1000;

  const watchRes = await fetch(
    `https://www.googleapis.com/drive/v3/changes/watch?pageToken=${pageToken}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address: `${Deno.env.get("SUPABASE_URL")}/functions/v1/drive-webhook`,
        expiration,
      }),
    }
  );

  const channel = await watchRes.json();

  await supabase.from("system_config").upsert([
    { key: "drive_channel_id", value: channel.id },
    { key: "drive_channel_resource_id", value: channel.resourceId },
    { key: "drive_channel_expiry", value: String(channel.expiration) },
  ]);

  return new Response(JSON.stringify({ renewed: true, expiry: channel.expiration }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

Deploy: `supabase functions deploy drive-renew --no-verify-jwt`

---

## Task 3: Schedule auto-renewal via pg_cron

**What:** Run renewal every 18 hours (~80% of 24-hour TTL) to ensure no gaps.

```sql
SELECT cron.schedule(
    'drive-watch-renewal',
    '0 */18 * * *',    -- every 18 hours
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT.supabase.co/functions/v1/drive-renew',
        headers := jsonb_build_object(
            'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
            'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
);
```

**Error recovery:** If renewal fails, the watch expires silently. Add a check to the drive-webhook handler:
```typescript
// At the start of drive-webhook handler:
const { data: expiryConfig } = await supabase
  .from("system_config")
  .select("value")
  .eq("key", "drive_channel_expiry")
  .single();

if (expiryConfig && Number(expiryConfig.value) < Date.now()) {
  // Channel expired — trigger immediate renewal
  await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/drive-renew`, {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
  });
}
```

---

## Verification

- [ ] Channel info (ID, resourceId, expiry) is stored in `system_config`
- [ ] Renewal function stops old channel and creates new one
- [ ] Page token is preserved across renewals (no missed changes)
- [ ] pg_cron job runs every 18 hours: `SELECT * FROM cron.job WHERE jobname = 'drive-watch-renewal';`
- [ ] Expired channel triggers automatic re-subscription
- [ ] No gap in notifications during renewal (old channel is stopped after new one is active)

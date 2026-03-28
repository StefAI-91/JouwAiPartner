# Sprint 10: Google Drive Ingestion Setup

**Phase:** V2 — Toegang & Kwaliteit
**Requirements:** REQ-300, REQ-306, REQ-307
**Depends on:** Sprint 01 (Supabase project), Sprint 05 (Gatekeeper pipeline)
**Produces:** Google Drive push notifications connected to our ingestion endpoint

---

## Task 1: Configure Google OAuth / Service Account

**What:** Set up credentials for the Google Drive API with domain-wide delegation.

**Steps:**

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Enable **Google Drive API**
2. Create a **Service Account**:
   - IAM & Admin → Service Accounts → Create
   - Grant no roles (Drive API uses OAuth scopes, not IAM)
   - Create key → JSON → download and store securely
3. Enable **domain-wide delegation** on the service account:
   - Service Account details → Enable "Domain-wide delegation"
   - Note the Client ID
4. In Google Workspace Admin:
   - Security → API Controls → Domain-wide delegation → Add new
   - Client ID: (from step 3)
   - Scopes: `https://www.googleapis.com/auth/drive.readonly`

**Store credentials:**

```bash
supabase secrets set GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"..."}'
```

**Service account auth utility (`supabase/functions/_shared/google-auth.ts`):**

```typescript
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

export async function getAccessToken(
  serviceAccountKey: string,
  userEmail: string,
): Promise<string> {
  const key = JSON.parse(serviceAccountKey);

  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: key.client_email,
      sub: userEmail, // impersonate this user
      scope: "https://www.googleapis.com/auth/drive.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: getNumericDate(0),
      exp: getNumericDate(3600),
    },
    await crypto.subtle.importKey(
      "pkcs8",
      new TextEncoder().encode(key.private_key),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    ),
  );

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const { access_token } = await response.json();
  return access_token;
}
```

---

## Task 2: Set up Google domain verification

**What:** Required for receiving Drive push notifications at your webhook URL.

**Steps:**

1. Go to [Google Search Console](https://search.google.com/search-console) → Add property → URL prefix → enter your Supabase Edge Functions domain
2. Verify ownership (DNS TXT record method is easiest for Supabase custom domains)
3. In Google Cloud Console → Domain Verification → add the verified domain

**Note:** If using `*.supabase.co` domain directly, you may need a custom domain. Check if Supabase Edge Functions support custom domains on your plan.

---

## Task 3: Create Drive webhook endpoint + subscribe to changes

**What:** Edge Function that receives Drive push notifications and triggers doc ingestion.

**Create `supabase/functions/drive-webhook/index.ts`:**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken } from "../_shared/google-auth.ts";

Deno.serve(async (req) => {
  // Google sends a sync message on subscription — respond 200
  const channelId = req.headers.get("x-goog-channel-id");
  const resourceState = req.headers.get("x-goog-resource-state");

  if (resourceState === "sync") {
    return new Response("OK", { status: 200 });
  }

  // Only process "change" notifications
  if (resourceState !== "change") {
    return new Response("OK", { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const accessToken = await getAccessToken(
    Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY")!,
    Deno.env.get("GOOGLE_ADMIN_EMAIL")!, // email to impersonate
  );

  // Fetch the changes using stored page token
  // Page token management is handled in Sprint 11
  // For now, acknowledge the webhook
  console.log("Drive change notification received:", { channelId, resourceState });

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
```

**Subscribe to Drive changes (run once to start, then auto-renew in Sprint 12):**

```typescript
// Call this to start watching Drive changes
async function subscribeToDriveChanges(accessToken: string): Promise<void> {
  // First, get the start page token
  const tokenRes = await fetch("https://www.googleapis.com/drive/v3/changes/startPageToken", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const { startPageToken } = await tokenRes.json();

  // Store it for later use
  // ... save to a config table in Supabase ...

  // Subscribe to changes
  const watchRes = await fetch(
    `https://www.googleapis.com/drive/v3/changes/watch?pageToken=${startPageToken}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: crypto.randomUUID(), // unique channel ID
        type: "web_hook",
        address: "https://YOUR_PROJECT.supabase.co/functions/v1/drive-webhook",
        expiration: Date.now() + 23 * 60 * 60 * 1000, // 23 hours (max 24h)
      }),
    },
  );

  const channel = await watchRes.json();
  // Store channel.id and channel.resourceId for renewal/unsubscription
}
```

Deploy: `supabase functions deploy drive-webhook --no-verify-jwt`

---

## Verification

- [ ] Service account created with domain-wide delegation
- [ ] Google Drive API enabled in Cloud Console
- [ ] Domain verified in Search Console
- [ ] Edge Function receives sync notification on subscription (HTTP 200)
- [ ] `changes.watch` subscription is active
- [ ] Drive change notifications arrive at the webhook endpoint

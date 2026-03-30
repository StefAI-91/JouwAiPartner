# Credentials & Secrets Inventaris

**Datum:** 2026-03-30
**Doel:** Volledig overzicht van alle secrets, waar ze worden gebruikt, en rotatiebeleid.

---

## Overzicht

| Secret                          | Risico  | Locatie         | Rotatie   |
| ------------------------------- | ------- | --------------- | --------- |
| `SUPABASE_SERVICE_ROLE_KEY`     | Kritiek | Server-only     | Handmatig |
| `FIREFLIES_API_KEY`             | Hoog    | Server-only     | Handmatig |
| `FIREFLIES_WEBHOOK_SECRET`      | Hoog    | Server-only     | Handmatig |
| `ANTHROPIC_API_KEY`             | Hoog    | Server-only     | Handmatig |
| `COHERE_API_KEY`                | Hoog    | Server-only     | Handmatig |
| `CRON_SECRET`                   | Hoog    | Server-only     | Handmatig |
| `NEXT_PUBLIC_SUPABASE_URL`      | Publiek | Client + Server | N.v.t.    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publiek | Client + Server | N.v.t.    |

---

## Gedetailleerd overzicht

### SUPABASE_SERVICE_ROLE_KEY

- **Risico:** Kritiek
- **Beschrijving:** Geeft volledige database-toegang, bypassed RLS policies
- **Gebruikt in:**
  - `src/lib/supabase/admin.ts` — Singleton admin client
  - Alle queries in `src/lib/queries/`
  - Alle server actions in `src/lib/actions/`
  - Alle MCP tools in `src/lib/mcp/tools/`
  - `supabase/functions/re-embed-worker/index.ts`
- **Opgeslagen:** Vercel environment variables
- **Bij lek:** Aanvaller heeft volledige read/write toegang tot alle data
- **Rotatie:** Via Supabase dashboard > Settings > API > Regenerate service role key
- **Actie na rotatie:** Update Vercel env vars + redeploy

### FIREFLIES_API_KEY

- **Risico:** Hoog
- **Beschrijving:** Bearer token voor Fireflies GraphQL API
- **Gebruikt in:**
  - `src/lib/fireflies.ts:65,72,98,105` — Authorization header
- **Bij lek:** Aanvaller kan alle Fireflies transcripts ophalen
- **Rotatie:** Via Fireflies dashboard > Integrations > API Key

### FIREFLIES_WEBHOOK_SECRET

- **Risico:** Hoog
- **Beschrijving:** HMAC-SHA256 secret voor webhook signature verificatie
- **Gebruikt in:**
  - `src/app/api/webhooks/fireflies/route.ts:9-14`
- **Bij lek:** Aanvaller kan nep-webhook events sturen
- **Rotatie:** Via Fireflies dashboard > Webhooks > Secret

### ANTHROPIC_API_KEY

- **Risico:** Hoog
- **Beschrijving:** API key voor Claude modellen via @ai-sdk/anthropic
- **Gebruikt in:**
  - Impliciet door `@ai-sdk/anthropic` SDK
  - `src/lib/agents/gatekeeper.ts`
  - `src/lib/agents/extractor.ts`
  - `src/app/api/ask/route.ts`
- **Bij lek:** Kostenrisico (ongelimiteerde API calls) + data-exposure via prompts
- **Rotatie:** Via Anthropic console > API Keys

### COHERE_API_KEY

- **Risico:** Hoog
- **Beschrijving:** API key voor Cohere embedding service
- **Gebruikt in:**
  - `src/lib/embeddings.ts:7` — CohereClient constructor
  - `supabase/functions/re-embed-worker/index.ts`
- **Bij lek:** Kostenrisico + tekst die naar Cohere is gestuurd is zichtbaar in Cohere dashboard
- **Rotatie:** Via Cohere dashboard > API Keys

### CRON_SECRET

- **Risico:** Hoog
- **Beschrijving:** Bearer token voor cron en ingest endpoints
- **Gebruikt in:**
  - `src/app/api/ingest/fireflies/route.ts:28-32`
  - `src/app/api/cron/re-embed/route.ts:6-10`
  - `src/app/api/test/fireflies/route.ts:10-14`
  - `src/app/api/test/embed/route.ts:9-12`
- **Bij lek:** Aanvaller kan ingest en re-embedding triggeren
- **Rotatie:** Genereer nieuw random token, update Vercel env vars + Vercel cron config

### NEXT_PUBLIC_SUPABASE_URL

- **Risico:** Publiek (bewust)
- **Beschrijving:** Supabase project URL
- **Opmerking:** Zichtbaar in client-side JavaScript, dit is by design

### NEXT_PUBLIC_SUPABASE_ANON_KEY

- **Risico:** Publiek (bewust)
- **Beschrijving:** Supabase anon key, beperkt door RLS policies
- **Opmerking:** Zichtbaar in client-side JavaScript, dit is by design. Effectieve beveiliging hangt af van RLS policies (momenteel niet actief).

---

## Opslaglocaties

| Omgeving | Methode                    | Versleuteld  |
| -------- | -------------------------- | ------------ |
| Lokaal   | `.env.local` (niet in git) | Nee          |
| Vercel   | Environment Variables      | Ja (at rest) |
| Supabase | Vault Secrets (Edge Func.) | Ja           |

---

## Rotatieprotocol

### Bij vermoeden van lek

1. **Direct:** Roteer de gelekte key via het dashboard van de provider
2. **Binnen 15 minuten:** Update de environment variable in Vercel
3. **Binnen 30 minuten:** Redeploy de applicatie
4. **Binnen 1 uur:** Check logs op ongeautoriseerd gebruik in de tussentijd
5. **Documenteer:** Noteer in incident log wat er is gebeurd

### Periodieke rotatie (aanbevolen)

| Secret           | Aanbevolen interval |
| ---------------- | ------------------- |
| Service role key | Elke 90 dagen       |
| API keys         | Elke 90 dagen       |
| Webhook secret   | Elke 90 dagen       |
| CRON_SECRET      | Elke 90 dagen       |

**Status:** Periodieke rotatie is nog niet ingericht. Dit is een open actiepunt.

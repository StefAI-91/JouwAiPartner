# Security Audit Report

**Datum:** 2026-03-30
**Scope:** Volledige codebase JouwAiPartner Knowledge Platform
**Versie:** Post-sprint 006

---

## Samenvatting

Het platform verwerkt meeting-transcripts van klant- en interne gesprekken via 5 externe integraties. De applicatie-architectuur is solide (TypeScript strict, Zod validatie, parameterized queries), maar er zijn kritieke gaten in authenticatie, autorisatie en security headers.

| Ernst   | Aantal | Status |
| ------- | ------ | ------ |
| Kritiek | 4      | Open   |
| Hoog    | 5      | Open   |
| Midden  | 5      | Open   |
| Laag    | 3      | Open   |

---

## Kritieke issues

### SEC-001: API endpoints zonder authenticatie

**Ernst:** Kritiek
**Bestanden:**

- `src/app/api/search/route.ts`
- `src/app/api/ask/route.ts`
- `src/app/api/mcp/route.ts`

**Beschrijving:** De routes `/api/search`, `/api/ask` en `/api/mcp` staan uitgesloten van de middleware auth check (`src/middleware.ts:49`). Ze hebben ook geen eigen authenticatie. Iedereen met de URL kan alle klantdata doorzoeken.

**Impact:** Volledige kennisbank (meetings, besluiten, actiepunten, organisaties, personen) is toegankelijk zonder login.

**Aanbeveling:** Auth check toevoegen aan elke route, ofwel via Supabase session cookies ofwel via API key validatie. Voor MCP: API key header vereisen.

---

### SEC-002: MCP tools draaien op admin client zonder autorisatie

**Ernst:** Kritiek
**Bestanden:**

- `src/lib/mcp/tools/search.ts`
- `src/lib/mcp/tools/meetings.ts`
- `src/lib/mcp/tools/actions.ts`
- `src/lib/mcp/tools/decisions.ts`
- `src/lib/mcp/tools/organizations.ts`
- `src/lib/mcp/tools/projects.ts`
- `src/lib/mcp/tools/people.ts`
- `src/lib/mcp/server.ts`

**Beschrijving:** Alle 7 MCP tools gebruiken `getAdminClient()` (service role key) zonder te checken wie de aanvrager is. Gecombineerd met SEC-001 kan iedereen via `/api/mcp` alle data opvragen.

**Impact:** Ongeautoriseerde toegang tot alle organisatie-, meeting- en persoonsdata.

**Aanbeveling:** User context doorgeven aan MCP tools, resultaten filteren op organisatie.

---

### SEC-003: CRON_SECRET is optioneel

**Ernst:** Kritiek
**Bestanden:**

- `src/app/api/ingest/fireflies/route.ts:28-32`
- `src/app/api/cron/re-embed/route.ts:6-10`
- `src/app/api/test/fireflies/route.ts:10-14`
- `src/app/api/test/embed/route.ts:9-12`

**Beschrijving:** Auth check is conditioneel: `if (process.env.CRON_SECRET && ...)`. Als de environment variable niet is ingesteld, wordt auth volledig overgeslagen.

**Impact:** Zonder CRON_SECRET kan iedereen meeting-ingest triggeren en re-embedding starten.

**Fix:**

```typescript
// Huidige code (onveilig):
if (process.env.CRON_SECRET && authHeader !== expectedToken) { ... }

// Correcte code:
if (!process.env.CRON_SECRET || authHeader !== expectedToken) { ... }
```

---

### SEC-004: Alle database queries via admin client

**Ernst:** Kritiek
**Bestanden:**

- `src/lib/supabase/admin.ts`
- `src/lib/queries/content.ts`
- `src/lib/queries/meetings.ts`
- `src/lib/queries/organizations.ts`
- `src/lib/queries/people.ts`
- `src/lib/queries/projects.ts`
- `src/lib/actions/meetings.ts`
- `src/lib/actions/decisions.ts`
- `src/lib/actions/action-items.ts`
- `src/lib/actions/embeddings.ts`

**Beschrijving:** Vrijwel alle database operaties gebruiken de admin client (service role key) die RLS bypassed. Server actions voeren inserts/updates uit zonder te valideren of de huidige gebruiker daartoe bevoegd is.

**Impact:** Elke geauthenticeerde gebruiker heeft effectief admin-toegang tot alle data.

**Aanbeveling:** Reguliere queries via server client (anon key + user session). Admin client alleen voor pipeline/ingest taken.

---

## Hoge issues

### SEC-005: Geen security headers

**Ernst:** Hoog
**Bestand:** `next.config.ts`

**Beschrijving:** Geen Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, of Strict-Transport-Security headers geconfigureerd.

**Impact:** Kwetsbaar voor XSS, clickjacking, en MIME-type sniffing.

**Fix:** Headers toevoegen aan `next.config.ts`:

```typescript
headers: async () => [
  {
    source: "/(.*)",
    headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ],
  },
];
```

---

### SEC-006: Geen rate limiting

**Ernst:** Hoog
**Bestanden:** Alle routes in `src/app/api/`

**Beschrijving:** Geen enkele API route heeft rate limiting. Dit geldt ook voor de login pagina.

**Impact:** Brute force op login, cost exhaustion via AI API calls (Anthropic, Cohere), en abuse van zoekfunctionaliteit.

**Aanbeveling:** Vercel rate limiting of custom middleware met sliding window.

---

### SEC-007: Geen CORS configuratie

**Ernst:** Hoog
**Bestand:** `next.config.ts`

**Beschrijving:** Geen CORS headers geconfigureerd. Elke origin kan API requests sturen.

**Impact:** Cross-site request forgery en ongeautoriseerde API calls vanuit externe websites.

**Aanbeveling:** CORS restrictie op API routes, alleen eigen domein(en) toestaan.

---

### SEC-008: Geen RLS policies op database

**Ernst:** Hoog
**Bestanden:** Alle migraties in `supabase/migrations/`

**Beschrijving:** Geen enkele tabel heeft Row Level Security (RLS) ingeschakeld. Geen `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` of `CREATE POLICY` statements in de migraties.

**Impact:** Zodra de browser client direct queries doet (nu niet het geval), kan elke ingelogde gebruiker alle data zien. Dit is bewust uitgesteld naar v3 maar moet gedocumenteerd zijn als geaccepteerd risico.

**Status:** Gedeeltelijk afgerond.

- **DevHub (2026-04-13, DH-017):** Fine-grained RLS live op `issues`, `issue_comments`, `issue_activity`, `devhub_project_access`. Members zien alleen projecten waartoe ze via `devhub_project_access` toegang hebben; admins impliciet alles. Helpers: `is_admin(uuid)` en `has_project_access(uuid, uuid)` — beide `STABLE SECURITY DEFINER`. Permissieve policies uit `20260409100003_devhub_rls_policies.sql` zijn vervangen. App-layer enforcement (DH-016) blijft primaire verdediging; DB-laag is defense-in-depth.
- **Cockpit:** Nog steeds permissieve RLS op meetings/extractions/tasks/e.d. Geplande fine-grained fix in v3 (client portal).

---

### SEC-009: Geen audit logging

**Ernst:** Hoog
**Bestanden:** Alle API routes en server actions

**Beschrijving:** Er is geen audit trail voor wie welke data heeft opgevraagd, aangepast of verwijderd. Agent-acties worden wel in de database opgeslagen, maar API-toegang wordt niet gelogd.

**Impact:** Bij een incident kan niet worden vastgesteld wat er is gebeurd, door wie, en wanneer.

**Aanbeveling:** Structured logging per API request (user, action, timestamp, resource).

---

## Midden issues

### SEC-010: Login foutmeldingen lekken informatie

**Ernst:** Midden
**Bestand:** `src/app/login/page.tsx`

**Beschrijving:** Specifieke foutmeldingen ("Unauthorized", "Invalid credentials") maken het mogelijk om te achterhalen of een e-mailadres bestaat in het systeem.

**Impact:** User enumeration door aanvallers.

**Fix:** Generiek foutbericht: "E-mail of wachtwoord is onjuist."

---

### SEC-011: Webhook signature niet timing-safe

**Ernst:** Midden
**Bestand:** `src/app/api/webhooks/fireflies/route.ts:9-14`

**Beschrijving:** HMAC-SHA256 signature verificatie gebruikt `===` in plaats van `crypto.timingSafeEqual()`. Dit maakt theoretisch timing attacks mogelijk.

**Fix:**

```typescript
import { timingSafeEqual } from "crypto";
const a = Buffer.from(computed, "hex");
const b = Buffer.from(signature, "hex");
return a.length === b.length && timingSafeEqual(a, b);
```

---

### SEC-012: Geen secret scanning in pre-commit

**Ernst:** Midden
**Bestand:** `.husky/pre-commit`

**Beschrijving:** Pre-commit hooks draaien eslint + prettier maar scannen niet op per ongeluk gecommitte secrets (API keys, wachtwoorden).

**Aanbeveling:** `gitleaks` of `git-secrets` toevoegen aan pre-commit hook.

---

### SEC-013: Geen dependency scanning

**Ernst:** Midden
**Bestand:** `package.json`

**Beschrijving:** Geen Dependabot, Snyk, of geautomatiseerde `npm audit` in CI/CD pipeline. Kwetsbare packages worden niet automatisch gedetecteerd.

**Aanbeveling:** Dependabot inschakelen op GitHub of Snyk integratie.

---

### SEC-014: Geen data retentiebeleid

**Ernst:** Midden
**Bestanden:** Alle migraties

**Beschrijving:** Geen soft-delete, geen retention triggers, geen GDPR-delete mechanismen. Meeting transcripts en extracties worden onbeperkt bewaard. Er is geen gestructureerde manier om klantdata te verwijderen bij offboarding.

**Impact:** GDPR compliance risico, data accumuleert zonder limiet.

**Aanbeveling:** `deleted_at` kolom op alle tabellen, retention policy per organisatie, offboarding script.

---

## Lage issues

### SEC-015: Test endpoints check NODE_ENV onvolledig

**Ernst:** Laag
**Bestanden:**

- `src/app/api/test/fireflies/route.ts:5-8`
- `src/app/api/test/embed/route.ts:5-6`

**Beschrijving:** Test endpoints checken `NODE_ENV === "production"` om toegang te blokkeren. Als NODE_ENV niet is ingesteld, zijn endpoints beschikbaar.

**Fix:** Whitelist in plaats van blacklist: `if (process.env.NODE_ENV !== "development")`.

---

### SEC-016: Sensitive data in console.error

**Ernst:** Laag
**Bestanden:**

- `src/lib/fireflies.ts:84,117`
- `src/lib/services/gatekeeper-pipeline.ts:105,161,173`
- `src/lib/services/save-extractions.ts:82`

**Beschrijving:** Error logging via `console.error()` kan API foutmeldingen met interne details naar Vercel logs schrijven.

**Aanbeveling:** Structured logging framework, geen gevoelige data in error messages naar client.

---

### SEC-017: Orphaned query functies

**Ernst:** Laag
**Bestanden:**

- `src/lib/queries/decisions.ts`
- `src/lib/queries/action-items.ts`

**Beschrijving:** Deze files bevatten queries naar tabellen (`decisions`, `action_items`) die zijn gedropped in migratie `20260329000001_drop_old_schema.sql`. Ze zullen runtime crashen.

**Fix:** Verwijderen of refactoren naar de `extractions` tabel.

---

## Geaccepteerde MVP-risico's

### WG-MVP-001: Widget-ingest zonder rate-limit ✅ Opgelost (WG-005)

**Status:** Opgelost in WG-005 (commit-hash zie git log).
**Bestanden:**

- `apps/devhub/src/app/api/ingest/widget/route.ts`
- `apps/devhub/src/lib/rate-limit.ts`
- `packages/database/src/mutations/widget/rate-limit.ts`
- `supabase/migrations/20260429130000_widget_rate_limits.sql`

**Eindresultaat:** 30 POST's/uur per Origin via een Postgres-counter
(`widget_rate_limits`-tabel + atomische `increment_rate_limit`-RPC). 31e
request krijgt `429` met `Retry-After`. Cleanup via `pg_cron` elk uur.

**Bewust geaccepteerd restrisico:** **fail-open** bij DB-uitval —
Postgres-fout op de RPC = request doorlaten (zie WG-REQ-096). Argumentatie:
30 minuten extra spam in triage is hersteldbaar; alle feedback per ongeluk
weggooien is dat niet. Origin-spoofing blijft daarnaast theoretisch mogelijk
maar vraagt een dedicated payload-signing-sprint; voor V0 is whitelist +
rate-limit het pragmatische maximum.

**`/api/ingest/userback`** is admin-only (cron + admin-session, geen public
Origin) en heeft daarom geen rate-limit nodig — util ondersteunt de
`userback_ingest`-prefix voor een hypothetische public-mode in de toekomst.

---

## Wat goed gaat

| Maatregel                                  | Status |
| ------------------------------------------ | ------ |
| Fireflies webhook HMAC-SHA256 validatie    | OK     |
| Zod validatie op alle API routes           | OK     |
| TypeScript strict mode                     | OK     |
| Parameterized queries (geen SQL injection) | OK     |
| Service role key niet in NEXT*PUBLIC* vars | OK     |
| `.gitignore` sluit `.env*` en `.pem` uit   | OK     |
| Test endpoints geblokkeerd in productie    | OK     |
| Idempotency checks bij data ingest         | OK     |
| Pre-commit hooks (eslint + prettier)       | OK     |
| Supabase opslag in EU-Frankfurt            | OK     |

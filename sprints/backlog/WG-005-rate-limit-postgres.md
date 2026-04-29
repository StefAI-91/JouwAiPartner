# Micro Sprint WG-005: Rate-limit op Ingest-routes (Postgres-counter)

## Doel

Rate-limit terugbrengen op `/api/ingest/widget` en `/api/ingest/userback` vóór de eerste klant-rollout (WG-004). MVP draaide bewust zonder rate-limit (cockpit-only, whitelist beperkte abuse-oppervlak — zie WG-001 §Risico's). Zodra externe Origins op de whitelist komen verandert het dreigingsmodel: een scriptkid die Origin spoofed kan triage-queue floodden. Postgres-counter is de pragmatische keuze: hergebruikt bestaande Supabase-infra, geen nieuwe externe service zoals Upstash. Eén UPSTRT per POST is acceptabel bij 30 req/uur volume.

## Requirements

| ID         | Beschrijving                                                                                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WG-REQ-090 | Tabel `widget_rate_limits (origin text, hour_bucket timestamptz, count int)`, PK `(origin, hour_bucket)`. `hour_bucket` = `date_trunc('hour', now())`. Geen FK — origins kunnen ook verwijderd zijn uit whitelist |
| WG-REQ-091 | Mutation-helper `incrementRateLimit(origin)` in `packages/database/src/mutations/widget/rate-limit.ts` — UPSERT met `count = count + 1`, returnt het nieuwe count                                                 |
| WG-REQ-092 | Util `rateLimitOrigin(origin)` in `apps/devhub/src/lib/rate-limit.ts`: roept mutation, returnt `{ success: count <= 30 }`. Limit-waarde komt uit constanten-file zodat 't makkelijk te tweaken is per route       |
| WG-REQ-093 | Widget-route + userback-route gebruiken beide deze util. `prefix`-arg onderscheidt counters per route (`widget_ingest:foo.com` vs `userback_ingest:foo.com`)                                                      |
| WG-REQ-094 | Cleanup-job: dagelijks een cron (Vercel cron of Supabase scheduled function) die rijen ouder dan 24u verwijdert. Zonder cleanup groeit de tabel oneindig                                                          |
| WG-REQ-095 | RLS op `widget_rate_limits`: alleen service-role kan schrijven/lezen. Geen authenticated access                                                                                                                   |
| WG-REQ-096 | Failure-mode: als Postgres faalt → fail-open (return success). Reden: feedback-storm beter dan feedback-blackout. Documenteer keuze in audit-report                                                               |
| WG-REQ-097 | Limit gedocumenteerd in `docs/ops/widget-migration.md` zodat klanten weten wat hun budget is per uur                                                                                                              |
| WG-REQ-098 | Acceptance-test: 31 POSTs binnen een uur vanaf zelfde Origin → 31e krijgt 429. 30 binnen één uur, 1 in volgende uur → alle 31 slagen                                                                              |

## Afhankelijkheden

- **WG-001** moet af zijn (route bestaat al, util wordt eraan vastgehaakt)
- Bestaand: DH-007 userback-route met in-memory rate-limit (wordt vervangen)

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- **Q1: Limit per Origin of per (Origin × project_id)?** Aanbeveling: **per Origin**. Eén klant heeft typisch één Origin; per-Origin is ook eenvoudiger te triagen ("welk domein floodt?"). Per-project wordt complex zodra één klant meerdere widgets heeft.
- **Q2: 30 req/uur is V0-gok — meten en aanpassen?** Aanbeveling: ja, log werkelijk gebruik per Origin in eerste maand na WG-004. Als 30 te krap blijkt: verhogen. Limit zit in een constanten-file zodat één edit + redeploy genoeg is.
- **Q3: Cleanup via Supabase pg_cron of via Vercel Cron?** Aanbeveling: **Supabase pg_cron** (DB-native, geen extra infra). Vercel Cron werkt ook, maar vraagt een extra route + secret. pg_cron is `SELECT cron.schedule(...)` in een migratie — done.

## Taken

### 1. Migratie

`supabase/migrations/<timestamp>_widget_rate_limits.sql`:

```sql
CREATE TABLE widget_rate_limits (
  origin text NOT NULL,
  hour_bucket timestamptz NOT NULL,
  count int NOT NULL DEFAULT 0,
  PRIMARY KEY (origin, hour_bucket)
);

CREATE INDEX idx_widget_rate_limits_bucket ON widget_rate_limits(hour_bucket);

ALTER TABLE widget_rate_limits ENABLE ROW LEVEL SECURITY;
-- Geen policies → alleen service-role kan lezen/schrijven

-- pg_cron cleanup (verwijder rijen > 24u oud, draait elk uur)
SELECT cron.schedule(
  'cleanup-widget-rate-limits',
  '0 * * * *',
  $$DELETE FROM widget_rate_limits WHERE hour_bucket < now() - interval '24 hours'$$
);
```

### 2. Mutation-helper

`packages/database/src/mutations/widget/rate-limit.ts`:

```ts
export async function incrementRateLimit(origin: string, client?: SupabaseClient): Promise<number> {
  const db = client ?? getAdminClient();
  const bucket = new Date();
  bucket.setMinutes(0, 0, 0);

  const { data, error } = await db
    .from("widget_rate_limits")
    .upsert(
      { origin, hour_bucket: bucket.toISOString(), count: 1 },
      { onConflict: "origin,hour_bucket", ignoreDuplicates: false },
    )
    .select("count")
    .single();

  if (error) throw error;
  return data.count;
}
```

> Let op: PostgREST `upsert` met conflict-target doet géén `count = count + 1` automatisch. Implementatie via `rpc()` of een Postgres-functie is veiliger:

```sql
CREATE FUNCTION increment_rate_limit(p_origin text)
RETURNS int LANGUAGE sql AS $$
  INSERT INTO widget_rate_limits(origin, hour_bucket, count)
  VALUES (p_origin, date_trunc('hour', now()), 1)
  ON CONFLICT (origin, hour_bucket) DO UPDATE SET count = widget_rate_limits.count + 1
  RETURNING count;
$$;
```

Mutation-helper roept `db.rpc('increment_rate_limit', { p_origin })`.

### 3. Util

`apps/devhub/src/lib/rate-limit.ts`:

```ts
import { incrementRateLimit } from "@repo/database/mutations/widget/rate-limit";

const LIMIT_PER_HOUR = 30;

export async function rateLimitOrigin(
  origin: string,
  prefix: "widget_ingest" | "userback_ingest" = "widget_ingest",
): Promise<{ success: boolean; count: number }> {
  try {
    const key = `${prefix}:${origin}`;
    const count = await incrementRateLimit(key);
    return { success: count <= LIMIT_PER_HOUR, count };
  } catch (e) {
    console.error("rate_limit_failed", e);
    return { success: true, count: -1 }; // fail-open per WG-REQ-096
  }
}
```

### 4. Routes updaten

- `apps/devhub/src/app/api/ingest/widget/route.ts`: voeg `rateLimitOrigin(origin, 'widget_ingest')` toe vóór de DB-insert. Bij `!success` → 429
- `apps/devhub/src/app/api/ingest/userback/route.ts`: vervang in-memory rate-limit door `rateLimitOrigin(origin, 'userback_ingest')`
- Verwijder oude in-memory `apps/devhub/src/lib/rate-limit-old.ts` (als die bestaat)

### 5. Documentatie

- `docs/ops/widget-migration.md`: voeg sectie "Rate-limit" toe met huidige waarde + hoe aan te passen
- `docs/security/audit-report.md`: update WG-REQ-013-entry — Origin-spoof + rate-limit gecombineerd dichten flood-risico

## Acceptatiecriteria

- [ ] WG-REQ-090: tabel + index + RLS aanwezig
- [ ] WG-REQ-091: mutation-helper + Postgres-functie unit-getest
- [ ] WG-REQ-092: util retourneert correcte success-flag bij 30 vs 31 calls
- [ ] WG-REQ-093: beide routes importeren één util, prefix correct toegepast
- [ ] WG-REQ-094: pg_cron-job zichtbaar in `cron.job` table; manueel triggerbaar voor test
- [ ] WG-REQ-096: fail-open getest door tijdelijk `getAdminClient` te breken — POST slaagt nog steeds
- [ ] WG-REQ-098: end-to-end test slaagt (31e POST = 429, na uur-grens = 200)
- [ ] WG-001 §Risico's "Geen rate-limit"-rij verwijderd in commit met deze sprint
- [ ] `npm run check:queries` blijft groen
- [ ] Type-check + lint slagen

## Risico's

| Risico                                                         | Mitigatie                                                                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `widget_rate_limits` groeit als pg_cron faalt                  | Index op `hour_bucket` houdt cleanup snel; alert op tabelgrootte > 100MB als observability later                   |
| Concurrente UPSERTs → race-condition op count                  | Postgres-functie met `ON CONFLICT DO UPDATE` is row-level atomisch; geen race                                      |
| Fail-open geeft DDoS-vector via Postgres-uitval                | Geaccepteerd: "alle feedback verloren" is erger dan "30 minuten extra spam in triage". Documenteer in audit-report |
| 30/uur is te krap voor power-user die echt veel feedback geeft | Constanten-file maakt verhogen 1-line-edit. Overschrijding logt naar Vercel; klant wordt benaderd over verhoging   |
| Cron-job draait niet in lokale dev                             | Acceptabel — lokaal heb je geen rate-limit-issues. Productie/staging hebben pg_cron actief                         |

## Bronverwijzingen

- WG-001: ingest-endpoint waar rate-limit op aangezet wordt
- WG-004: klant-rollout die deze sprint blokkeert
- DH-007: userback-route met oude in-memory rate-limit
- Postgres pg_cron: https://github.com/citusdata/pg_cron

## Vision-alignment

Vision §Delivery vereist betrouwbare ingest van klant-feedback. Rate-limit is operationele hygiëne: voorkomt dat één misconfigured klant of script-kiddie de triage-queue onbruikbaar maakt voor de rest. Hergebruik van Supabase-infra past bij de "geen extra services voor V1"-lijn.

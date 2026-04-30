-- WG-005: Rate-limit op /api/ingest/widget
-- Postgres-counter (geen Upstash) zodat we Supabase-infra hergebruiken. Eén
-- atomische UPSERT per request via een RPC-functie houdt het ON CONFLICT-
-- pad row-locked — geen race-condition tussen concurrente POSTs.
--
-- Schema: `key` is `<prefix>:<origin-host>` zodat we per route dezelfde
-- tabel kunnen delen zonder counters door elkaar te halen
-- (`widget_ingest:foo.com` vs `userback_ingest:foo.com`).

-- ── 1. Tabel ──
CREATE TABLE widget_rate_limits (
  key text NOT NULL,
  hour_bucket timestamptz NOT NULL,
  count int NOT NULL DEFAULT 0,
  PRIMARY KEY (key, hour_bucket)
);

-- Cleanup-cron loopt over hour_bucket → losse index, ook voor monitoring-
-- queries ("hoeveel buckets bestaan er nu?"). De PK dekt al alle key-
-- lookups die de UPSERT doet.
CREATE INDEX idx_widget_rate_limits_bucket ON widget_rate_limits(hour_bucket);

-- ── 2. RLS — alleen service-role ──
-- Geen policies → authenticated users kunnen niets. De RPC roept de tabel
-- via service-role aan, en de cleanup-cron draait sowieso met DB-owner-
-- rechten. Dichtgetimmerd zonder bypass-vector.
ALTER TABLE widget_rate_limits ENABLE ROW LEVEL SECURITY;

-- ── 3. RPC: atomische UPSERT-+-increment ──
-- PostgREST `upsert(...)` kan geen `count = count + 1` doen — daar is een
-- echte SQL-functie voor nodig. Returnt het nieuwe count zodat de caller
-- direct kan beslissen of hij over de limit zit.
CREATE OR REPLACE FUNCTION increment_rate_limit(p_key text)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO widget_rate_limits (key, hour_bucket, count)
  VALUES (p_key, date_trunc('hour', now()), 1)
  ON CONFLICT (key, hour_bucket)
  DO UPDATE SET count = widget_rate_limits.count + 1
  RETURNING count;
$$;

-- SECURITY DEFINER draait onder de owner-role. Expliciet `postgres` zetten
-- zodat een rebuild op een schone Supabase env (waar de migratie-runner
-- per ongeluk een andere rol kan zijn) niet stilletjes met te veel of te
-- weinig privileges gaat draaien. Op Supabase managed = postgres in de
-- praktijk, maar we vertrouwen niet op default-gedrag.
ALTER FUNCTION increment_rate_limit(text) OWNER TO postgres;

-- Service-role mag de functie aanroepen; geen authenticated/anon access
-- (consistent met de tabel-policy).
REVOKE ALL ON FUNCTION increment_rate_limit(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION increment_rate_limit(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION increment_rate_limit(text) TO service_role;

-- ── 4. Cleanup-cron ──
-- Verwijder elke uur rijen ouder dan 24u. Zonder cleanup groeit de tabel
-- lineair (≈ N origins × 24 buckets × per dag). pg_cron is al enabled in
-- `20260329000011_pg_cron_reembed.sql`, dus alleen de schedule toevoegen.
SELECT cron.schedule(
  'cleanup-widget-rate-limits',
  '0 * * * *',
  $$DELETE FROM widget_rate_limits WHERE hour_bucket < now() - interval '24 hours'$$
);

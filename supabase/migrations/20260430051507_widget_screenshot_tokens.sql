-- WG-006a: Widget screenshot upload tokens
-- Opslag van eenmalig-claimbare tokens voor screenshots die de widget heeft
-- ge-upload maar nog niet aan een issue gekoppeld zijn. WG-006b claimt het
-- token bij feedback-submit en koppelt de bijbehorende storage-path als
-- attachment aan het issue.
--
-- Waarom een aparte tabel + token? Een attacker met geldige Origin +
-- project_id zou anders andermans storage-paden aan zijn eigen issue kunnen
-- koppelen. Het token is alleen geldig zolang de rij bestaat én niet
-- geclaimd is — UUID-entropie zelf is geen security-laag.
--
-- Patroon kopieert WG-005 (`widget_rate_limits`): kleine tabel + RLS
-- service-role-only + pg_cron-cleanup.

-- ── 1. Tabel ──
CREATE TABLE widget_screenshot_tokens (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour',
  claimed_at timestamptz NULL
);

-- Index op expires_at voor de cleanup-cron. claimed_at-lookup gaat in
-- WG-006b via de PK (token is bekend bij claim), dus daar geen index nodig.
CREATE INDEX idx_widget_screenshot_tokens_expires
  ON widget_screenshot_tokens(expires_at);

-- ── 2. RLS — alleen service-role ──
-- Geen policies → authenticated users kunnen niets. Uploads draaien via de
-- ingest-route die de admin-client gebruikt; cleanup-cron draait als DB-
-- owner. Identiek dichtgetimmerd als widget_rate_limits.
ALTER TABLE widget_screenshot_tokens ENABLE ROW LEVEL SECURITY;

-- ── 3. Cleanup-cron ──
-- Dagelijks 03:00 UTC verwijder rijen waarvan expires_at meer dan 24u
-- geleden is verstreken. Storage-objecten zelf worden in WG-006b opgeruimd
-- zodra de claim-flow er staat — dan weten we welke objecten écht wees
-- zijn versus welke bij een issue horen.
--
-- pg_cron is al enabled in `20260329000011_pg_cron_reembed.sql`.
SELECT cron.schedule(
  'cleanup-widget-screenshot-tokens',
  '0 3 * * *',
  $$DELETE FROM widget_screenshot_tokens
    WHERE expires_at < now() - interval '24 hours'$$
);

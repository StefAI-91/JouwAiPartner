-- Sprint 002 — Migratie 11: pg_cron schedule voor re-embed worker
-- Roept elke 5 minuten een Edge Function aan die stale embeddings herberekent.
-- pg_cron + pg_net moeten enabled zijn in Supabase dashboard.

-- Activeer pg_cron en pg_net (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule: elke 5 minuten een POST naar de re-embed Edge Function.
-- De Edge Function URL wordt via vault secret of hardcoded ingesteld.
-- Voor nu: een cron job die rijen markeert als klaar voor re-embed.
-- De daadwerkelijke embedding-call gebeurt in de Edge Function / server action.

-- Optie 1: Directe HTTP call via pg_net (als Edge Function beschikbaar is)
-- Dit wordt in sprint 005 geactiveerd wanneer de Edge Function klaar is.
-- Voor nu registreren we het schema alvast.

-- Fallback: een SQL-only job die stale counts logt (nuttig voor monitoring)
SELECT cron.schedule(
    'log-stale-embeddings',
    '*/5 * * * *',
    $$
    INSERT INTO _cron_log (job_name, result, created_at)
    SELECT
        'stale-embeddings',
        json_build_object(
            'people', (SELECT COUNT(*) FROM people WHERE embedding_stale = TRUE),
            'projects', (SELECT COUNT(*) FROM projects WHERE embedding_stale = TRUE),
            'meetings', (SELECT COUNT(*) FROM meetings WHERE embedding_stale = TRUE),
            'extractions', (SELECT COUNT(*) FROM extractions WHERE embedding_stale = TRUE)
        )::TEXT,
        NOW()
    $$
);

-- Logtabel voor cron jobs
CREATE TABLE IF NOT EXISTS _cron_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    job_name TEXT NOT NULL,
    result TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

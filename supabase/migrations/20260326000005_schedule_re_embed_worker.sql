-- Enable pg_cron and pg_net extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the re-embedding worker to run every 5 minutes.
-- It calls the Next.js API route which processes stale embeddings.
--
-- IMPORTANT: Before running this migration, set the following in Supabase:
--   1. Add CRON_SECRET to your environment variables
--   2. Replace YOUR_APP_URL with your actual deployed URL
--
-- To configure after deployment:
--   SELECT cron.unschedule('re-embed-stale');
--   Then re-run the schedule with updated values.

SELECT cron.schedule(
    're-embed-stale',
    '*/5 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://YOUR_APP_URL/api/cron/re-embed',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'),
            'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
);

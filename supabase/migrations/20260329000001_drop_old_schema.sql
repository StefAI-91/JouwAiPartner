-- Sprint 001 — Migratie 1: Drop oude tabellen, functions en cron jobs
-- Alles uit de v1 architectuur wordt verwijderd.

-- Drop cron job (als pg_cron beschikbaar is)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('re-embed-stale');
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available or job not found, skipping';
END;
$$;

-- Drop search functions
DROP FUNCTION IF EXISTS match_documents(VECTOR, FLOAT, INT);
DROP FUNCTION IF EXISTS search_all_content(VECTOR, FLOAT, INT);
DROP FUNCTION IF EXISTS match_people(VECTOR, FLOAT, INT);
DROP FUNCTION IF EXISTS search_meetings_by_participant(VECTOR, TEXT, FLOAT, INT);

-- Drop v2 tables (niet nodig in v1)
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS slack_messages CASCADE;
DROP TABLE IF EXISTS emails CASCADE;
DROP TABLE IF EXISTS people_skills CASCADE;
DROP TABLE IF EXISTS people_projects CASCADE;

-- Drop tables die vervangen worden door unified extractions
DROP TABLE IF EXISTS decisions CASCADE;
DROP TABLE IF EXISTS action_items CASCADE;
DROP TABLE IF EXISTS content_reviews CASCADE;
DROP TABLE IF EXISTS insights CASCADE;

-- Drop tables die opnieuw aangemaakt worden (schema + vector dim wijzigingen)
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS people CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

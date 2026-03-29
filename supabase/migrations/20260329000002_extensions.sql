-- Sprint 001 — Migratie 2: Extensions
-- vector voor embeddings, pg_cron + pg_net voor scheduled workers

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

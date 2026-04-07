-- Sprint 020 — Migratie 2: source kolom op meeting_projects
-- DATA-082

ALTER TABLE meeting_projects
  ADD COLUMN source TEXT NOT NULL DEFAULT 'ai'
  CHECK (source IN ('ai', 'manual', 'review'));

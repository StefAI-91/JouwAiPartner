-- CP-012: Project-sprints en portal-communicatie
-- CP-REQ-133, CP-REQ-134
--
-- Twee veranderingen op topics:
-- 1. `target_sprint_id` migreert van vrij text-veld naar uuid FK → sprints(id).
--    PRD §13.3 I-5 noemde dit gat al: text-veld was placeholder tot sprints
--    een echte entiteit zou worden. Bestaande text-waardes (legacy planning-
--    labels als "Sprint 5") gaan naar NULL omdat we ze niet betrouwbaar
--    kunnen mappen naar de nieuwe sprints-tabel — er zijn geen sprint-rijen
--    in productie als deze migratie draait. Dit is gelogd via RAISE NOTICE.
--
-- 2. Nieuwe kolom `origin` (sprint vs production) — scheidt geplande
--    sprint-deliverables van productie-feedback. Default 'production'
--    omdat de meeste bestaande topics uit productie-feedback ontstonden;
--    rijen die na de FK-migratie nog een target_sprint_id (uuid) hebben
--    krijgen 'sprint' — die hadden al expliciete sprint-koppeling.

DO $$
DECLARE
  legacy_count integer;
BEGIN
  SELECT COUNT(*) INTO legacy_count
  FROM topics
  WHERE target_sprint_id IS NOT NULL;

  IF legacy_count > 0 THEN
    RAISE NOTICE
      'CP-012: % topics had legacy text target_sprint_id values; setting them to NULL.',
      legacy_count;
  END IF;
END $$;

-- 1a. Tijdelijke kolom-rename om bestaande text-waardes te bewaren in een
--     audit-vriendelijke vorm (kunnen we later inspecteren als nodig).
ALTER TABLE topics RENAME COLUMN target_sprint_id TO target_sprint_legacy_text;

-- 1b. Nieuwe FK-kolom toevoegen (initieel NULL voor alle rijen).
ALTER TABLE topics
  ADD COLUMN target_sprint_id uuid REFERENCES sprints(id) ON DELETE SET NULL;

-- 1c. Drop het legacy text-kolom — we hebben besloten geen poging tot
--     auto-migratie te doen (geen betrouwbare sprint-rijen om naar te wijzen).
--     Indien een productie-omgeving wel rijen heeft met legacy waardes en
--     die wil bewaren: rollback en handmatig mappen vóór deze migratie.
ALTER TABLE topics DROP COLUMN target_sprint_legacy_text;

-- Bestaande index `idx_topics_target_sprint` (uit 20260428100003_topics_indexes)
-- is automatisch verwijderd door de DROP COLUMN hierboven. Recreëer met
-- dezelfde naam zodat naming-conventie consistent blijft.
CREATE INDEX IF NOT EXISTS idx_topics_target_sprint
  ON topics(target_sprint_id) WHERE target_sprint_id IS NOT NULL;

-- 2. Origin kolom — sprint vs production.
ALTER TABLE topics
  ADD COLUMN origin text NOT NULL DEFAULT 'production'
    CHECK (origin IN ('sprint', 'production'));

-- Backfill: rijen met (post-migratie) niet-null target_sprint_id krijgen
-- 'sprint'. In de praktijk zijn dat 0 rijen omdat we hierboven alle FK-
-- waardes naar NULL hebben gezet — dit blok dient als safety-net voor
-- toekomstige re-runs of voor envs waar handmatig FK-data is toegevoegd
-- vóór deze backfill.
UPDATE topics
SET origin = 'sprint'
WHERE target_sprint_id IS NOT NULL;

-- Index voor portal-filtering op origin.
CREATE INDEX IF NOT EXISTS idx_topics_project_origin
  ON topics(project_id, origin);

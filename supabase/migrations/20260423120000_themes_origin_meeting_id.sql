-- TH-011 (DATA-232) — `themes.origin_meeting_id` koppelt een emerging theme
-- terug naar de meeting waarin de Theme-Detector 'm voorstelde. Zet
-- `link-themes.ts` wanneer hij een proposal als `status='emerging'` row
-- aanmaakt. Nullable: seed-themes + oude TH-010 emerging-proposals hebben
-- geen origin. FK ON DELETE SET NULL: als de origin-meeting wordt gewist
-- blijft het thema staan (het kan inmiddels verified zijn + aan meerdere
-- meetings hangen), maar de herkomst verdwijnt.
--
-- Index is voor de per-meeting-review-tab query (UI-330):
--   SELECT * FROM themes WHERE status='emerging' AND origin_meeting_id = ?
-- Partial index op status='emerging' omdat verified themes deze query niet
-- meer hoeven te dienen.

ALTER TABLE themes
  ADD COLUMN origin_meeting_id uuid REFERENCES meetings(id) ON DELETE SET NULL;

CREATE INDEX themes_origin_meeting_emerging_idx
  ON themes(origin_meeting_id)
  WHERE status = 'emerging';

COMMENT ON COLUMN themes.origin_meeting_id IS
  'TH-011 — Meeting waarin de Theme-Detector dit thema als proposal voorstelde. Null voor seeds en pre-TH-011 emerging-themes.';

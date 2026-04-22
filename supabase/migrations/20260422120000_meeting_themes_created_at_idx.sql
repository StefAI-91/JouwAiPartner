-- TH-008 — Index op meeting_themes.created_at.
--
-- `fetchWindowAggregation` (queries/theme-internals.ts) en
-- `getThemeRecentActivity` (queries/theme-detail.ts) filteren op
-- `.gte("created_at", since)`. Zonder index wordt dat een full-table scan;
-- bij ≥10k matches merkbaar traag op het dashboard.
--
-- DESC omdat de dashboard-queries het meest recente venster pakken; een
-- ascending index zou óók werken (B-tree kan in beide richtingen scannen),
-- maar DESC matcht de meest voorkomende ORDER BY die we elders op deze
-- tabel doen (zie listEmergingThemes + getThemeMeetings).

CREATE INDEX IF NOT EXISTS meeting_themes_created_at_idx
  ON meeting_themes (created_at DESC);

COMMENT ON INDEX meeting_themes_created_at_idx IS
  'TH-008: ondersteunt window-queries op dashboard en theme-detail page.';

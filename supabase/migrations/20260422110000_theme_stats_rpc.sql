-- TH-007 — recalculate_theme_stats RPC (vervangt N+1 in mutations/meeting-themes.ts).
--
-- De ThemeTagger-pipeline en de rejectThemeMatchAction roepen beide
-- `recalculateThemeStats([...themeIds])` aan na een write. De oude
-- implementatie deed 3 queries × N themes sequentieel (count + latest +
-- update). Met één RPC-aanroep houden we het aantal round-trips constant
-- ongeacht N.
--
-- Twee UPDATEs in één functie:
--   1. Themes die nog matches hebben → mention_count + last_mentioned_at uit aggregatie.
--   2. Themes zonder enige match → reset naar 0 / NULL (subquery in UPDATE 1
--      produceert geen rows voor die themes, dus UPDATE 1 raakt ze niet).
--
-- Security-scope: GEEN `SECURITY DEFINER`. Beide callers draaien via
-- `getAdminClient()` (service role), identiek aan het
-- `reset_extractions_for_meeting`-patroon (migratie 20260419110000).
-- Authenticated users mogen deze functie niet rechtstreeks aanroepen —
-- zou een weg zijn om willekeurige theme-counts te forceren.

CREATE OR REPLACE FUNCTION recalculate_theme_stats(theme_ids uuid[])
RETURNS void
LANGUAGE sql
AS $$
  UPDATE themes t
  SET
    mention_count = COALESCE(s.cnt, 0),
    last_mentioned_at = s.latest
  FROM (
    SELECT
      theme_id,
      COUNT(*)::int AS cnt,
      MAX(created_at) AS latest
    FROM meeting_themes
    WHERE theme_id = ANY(theme_ids)
    GROUP BY theme_id
  ) s
  WHERE t.id = s.theme_id AND t.id = ANY(theme_ids);

  UPDATE themes t
  SET mention_count = 0, last_mentioned_at = NULL
  WHERE t.id = ANY(theme_ids)
    AND NOT EXISTS (SELECT 1 FROM meeting_themes mt WHERE mt.theme_id = t.id);
$$;

REVOKE ALL ON FUNCTION recalculate_theme_stats(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION recalculate_theme_stats(uuid[]) TO service_role;

COMMENT ON FUNCTION recalculate_theme_stats(uuid[]) IS
  'TH-007: recompute mention_count + last_mentioned_at voor gegeven theme_ids. '
  'Service-role only, aangeroepen vanuit de tag-themes pipeline en rejectThemeMatchAction.';

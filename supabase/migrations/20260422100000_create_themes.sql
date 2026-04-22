-- TH-001 — Themes foundation: drie tabellen voor cross-meeting thema's.
--
-- `themes` is de catalogus (seed + emerging). `meeting_themes` is de junction
-- die per meeting-match een evidence_quote + confidence bewaart. `theme_match_rejections`
-- is de feedback-loop: rejected matches worden als negative_examples in de
-- ThemeTagger-prompt geïnjecteerd (TH-006).
--
-- RLS volgt de permissive v1-lijn van `tasks` en `agent_runs`: authenticated
-- mag lezen + schrijven. Fine-grained role-based RLS verhuist naar v3 (portal),
-- zie docs/security/audit-report.md.
--
-- Denormalisatie (`mention_count`, `last_mentioned_at` op themes) is bewust:
-- dashboard-pills en donut moeten snel renderen zonder join-aggregaties.
-- De ThemeTagger updatet deze velden bij elke match (TH-003).

-- `set_updated_at()` bestaat al sinds 20260409100005_devhub_quality_fixes.sql,
-- maar we herdefiniëren hem idempotent zodat dit migration-bestand ook op een
-- schone DB (remote staging bijvoorbeeld) zelfstandig draait.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- themes
-- =============================================================================
CREATE TABLE themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🏷️',
  description text NOT NULL,
  matching_guide text NOT NULL,
  status text NOT NULL DEFAULT 'emerging'
    CHECK (status IN ('emerging', 'verified', 'archived')),
  created_by_agent text,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  archived_at timestamptz,
  last_mentioned_at timestamptz,
  mention_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX themes_status_idx ON themes(status);
CREATE INDEX themes_last_mentioned_idx ON themes(last_mentioned_at DESC);

CREATE TRIGGER trg_themes_updated_at
  BEFORE UPDATE ON themes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY themes_select_authenticated
  ON themes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY themes_insert_authenticated
  ON themes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY themes_update_authenticated
  ON themes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY themes_delete_authenticated
  ON themes FOR DELETE
  TO authenticated
  USING (true);

COMMENT ON TABLE themes IS 'Cross-meeting thema-catalogus. Seed (status=verified) + AI-emerging. Voedt dashboard-pills + donut + detail-pages.';

-- =============================================================================
-- meeting_themes (junction)
-- =============================================================================
CREATE TABLE meeting_themes (
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  confidence text NOT NULL
    CHECK (confidence IN ('medium', 'high')),
  evidence_quote text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (meeting_id, theme_id)
);

CREATE INDEX meeting_themes_theme_idx ON meeting_themes(theme_id);
CREATE INDEX meeting_themes_meeting_idx ON meeting_themes(meeting_id);

ALTER TABLE meeting_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY meeting_themes_select_authenticated
  ON meeting_themes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY meeting_themes_insert_authenticated
  ON meeting_themes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY meeting_themes_update_authenticated
  ON meeting_themes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY meeting_themes_delete_authenticated
  ON meeting_themes FOR DELETE
  TO authenticated
  USING (true);

COMMENT ON TABLE meeting_themes IS 'Junction: welke meetings zijn getagd met welk thema, met evidence + confidence. Low-confidence matches worden niet opgeslagen.';

-- =============================================================================
-- theme_match_rejections (feedback-loop)
-- =============================================================================
CREATE TABLE theme_match_rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  evidence_quote text NOT NULL,
  reason text NOT NULL
    CHECK (reason IN ('niet_substantieel', 'ander_thema', 'te_breed')),
  rejected_by uuid NOT NULL REFERENCES auth.users(id),
  rejected_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rejections_theme_recent
  ON theme_match_rejections(theme_id, rejected_at DESC);

ALTER TABLE theme_match_rejections ENABLE ROW LEVEL SECURITY;

CREATE POLICY theme_match_rejections_select_authenticated
  ON theme_match_rejections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY theme_match_rejections_insert_authenticated
  ON theme_match_rejections FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY theme_match_rejections_delete_authenticated
  ON theme_match_rejections FOR DELETE
  TO authenticated
  USING (true);

COMMENT ON TABLE theme_match_rejections IS 'Review-rejections van theme-matches. Voedt negative_examples in ThemeTagger-prompt zodat de agent bijleert.';

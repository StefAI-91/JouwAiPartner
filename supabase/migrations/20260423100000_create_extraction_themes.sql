-- TH-010 — Extraction-theme junction: per theme-match óók de specifieke
-- extractions die het thema dragen. Zonder deze laag toont `/themes/[slug]`
-- álle extractions uit alle gekoppelde meetings (te ruw: een founders-sync
-- die 3 thema's raakt laat al zijn decisions onder elk thema verschijnen).
--
-- Geen `type`-kolom op de junction — het type hoort op `extractions.type`,
-- join geeft de waarheid. Dupliceren zou drift geven.
--
-- RLS volgt de permissive v1-lijn (authenticated mag alles), consistent met
-- `meeting_themes` en `tasks`. Fine-grained role-based policies verhuizen
-- met de rest van het platform naar v3.

CREATE TABLE extraction_themes (
  extraction_id uuid NOT NULL REFERENCES extractions(id) ON DELETE CASCADE,
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  confidence text NOT NULL
    CHECK (confidence IN ('medium', 'high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (extraction_id, theme_id)
);

CREATE INDEX extraction_themes_theme_idx ON extraction_themes(theme_id);
CREATE INDEX extraction_themes_extraction_idx ON extraction_themes(extraction_id);

ALTER TABLE extraction_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY extraction_themes_select_authenticated
  ON extraction_themes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY extraction_themes_insert_authenticated
  ON extraction_themes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY extraction_themes_update_authenticated
  ON extraction_themes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY extraction_themes_delete_authenticated
  ON extraction_themes FOR DELETE
  TO authenticated
  USING (true);

COMMENT ON TABLE extraction_themes IS 'Junction: welke extractions dragen welk thema. Per theme-match geeft de ThemeTagger de concrete extractionIds terug; dit is de fundering voor per-meeting extractie-lijsten op de theme detail page.';

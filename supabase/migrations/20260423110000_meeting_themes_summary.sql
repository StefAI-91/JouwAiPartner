-- TH-010 — Per theme-match een korte samenvatting van wat de meeting specifiek
-- over dit thema besprak. Gevuld door de ThemeTagger (1-2 zinnen) en getoond
-- op de theme detail page naast de evidence-quote. Nullable omdat oude matches
-- (pre-TH-010 backfill) geen summary hebben — UI toont ze dan gewoon zonder
-- summary-regel, zelfde patroon als extractions-lijst (EDGE-220/EDGE-221).

ALTER TABLE meeting_themes
  ADD COLUMN summary text;

COMMENT ON COLUMN meeting_themes.summary IS 'ThemeTagger-generated 1-2 zinnen narrative: wat ging DEZE meeting specifiek over dit thema. Complementair aan evidence_quote (één letterlijke quote).';

-- TH-014 — theme_narratives tabel voor cross-meeting synthese per thema.
-- Een rij per thema (1-op-1 op themes). Gevuld door de theme-narrator agent
-- die alle meeting_themes.summary rijen van dat thema aggregeert tot één
-- lopende thema-pagina met zes secties + een signaal-check.
--
-- Staleness wordt niet opgeslagen — afgeleid in de query door
-- themes.last_mentioned_at > theme_narratives.generated_at te vergelijken.
--
-- Guardrail (pipeline-side): < 2 meetings met summary → agent wordt niet
-- gecalled, maar een sentinel-rij wordt geschreven met briefing =
-- '__insufficient__' en signal_strength = 'onvoldoende' zodat de UI een
-- empty-state kan tonen (TH-014 FUNC-301).

CREATE TABLE theme_narratives (
  theme_id uuid PRIMARY KEY REFERENCES themes(id) ON DELETE CASCADE,
  briefing text NOT NULL,
  patterns text,
  alignment text,
  friction text,
  open_points text,
  blind_spots text,
  signal_strength text NOT NULL CHECK (signal_strength IN ('sterk', 'matig', 'zwak', 'onvoldoende')),
  signal_notes text,
  meetings_count_at_generation integer NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE theme_narratives IS 'TH-014 — cross-meeting synthese per thema. 1-op-1 met themes. Geschreven door theme-narrator agent.';
COMMENT ON COLUMN theme_narratives.briefing IS 'Lede (2-3 zinnen) bovenaan de Verhaal-tab. Sentinel "__insufficient__" betekent <2 meetings; UI toont dan empty-state.';
COMMENT ON COLUMN theme_narratives.signal_strength IS 'Agent-zelfoordeel: sterk/matig/zwak bij echte synthese; onvoldoende bij guardrail-sentinel.';
COMMENT ON COLUMN theme_narratives.meetings_count_at_generation IS 'Aantal meeting_themes-rijen met summary op moment van genereren. Niet gebruikt voor staleness (dat is generated_at vs themes.last_mentioned_at).';

-- updated_at auto-bump via bestaande trigger-functie (zie update-timestamp
-- trigger elders in het schema). Gebruiken we via expliciete trigger:
CREATE TRIGGER theme_narratives_set_updated_at
  BEFORE UPDATE ON theme_narratives
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS: lees iedereen die authenticated is, schrijven alleen service-role.
-- Consistent met meeting_themes RLS-patroon (TH-010). Geen insert/update/
-- delete policy — schrijfkant loopt via service-role in pipeline +
-- admin-guarded server action.
ALTER TABLE theme_narratives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "theme_narratives_read_authenticated"
  ON theme_narratives
  FOR SELECT
  USING (auth.role() = 'authenticated');

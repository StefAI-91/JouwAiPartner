-- Sprint 041: Action Item Specialist productie-integratie.
--
-- Telemetrie-tabel naast de productie-extractions: schrijf per pipeline-run
-- één rij met run-metrics + de raw items + gegate items. Identiek pattern
-- aan experimental_risk_extractions (zie 20260418150000 +
-- 20260419100000_experimental_risk_extractions_append_only).
--
-- Doel: drift in prompt-versies + model-keuzes kunnen meten zonder de
-- productie-extractions-tabel te vervuilen met run-metadata. Append-only:
-- elke run maakt een nieuwe rij, query "laatste run" via
-- .order(created_at desc).limit(1) binnen (meeting_id, prompt_version).
--
-- Naam bewust "experimental_*" zodat we hetzelfde label gebruiken als bij
-- risks. Niet meer "experimenteel" in de letterlijke zin (de specialist
-- staat in productie); wel: een tabel die we mogen droppen zodra observability
-- naar agent_runs/dashboards is verschoven.

CREATE TABLE IF NOT EXISTS experimental_action_item_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Welk model + prompt-versie + modus heeft deze run gemaakt. Vereist voor
  -- eerlijke vergelijking tussen runs.
  model text NOT NULL,
  prompt_version text NOT NULL,
  mode text NOT NULL DEFAULT 'single',

  -- Geaccepteerde items (na gates + validator) — wat ook in extractions
  -- terechtkwam. JSONB i.p.v. aparte kolommen: dit is een audit/telemetrie-
  -- snapshot, geen query-target voor specifieke velden.
  items jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Items die door gates of validator gevallen zijn — handig om te zien
  -- waarom de productie-output kleiner is dan wat het model wilde
  -- accepteren. Schema: { item, reason, validator? }.
  gated jsonb NOT NULL DEFAULT '[]'::jsonb,

  accept_count integer NOT NULL DEFAULT 0,
  gate_count integer NOT NULL DEFAULT 0,

  -- Run-metrics.
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  reasoning_tokens integer,

  -- Als de agent crashte: error-bericht + items='[]'. Niet-failure is
  -- error=null + items kan wel of niet leeg zijn (agent liep door, eventueel
  -- 0 items geëxtraheerd).
  error text
);

CREATE INDEX IF NOT EXISTS experimental_action_item_extractions_meeting_idx
  ON experimental_action_item_extractions(meeting_id, created_at DESC);

COMMENT ON TABLE experimental_action_item_extractions IS
  'Run-telemetrie voor de Action Item Specialist (productie-pipeline). '
  'APPEND-ONLY — elke run maakt een nieuwe rij. Query "laatste run" via '
  '.order(created_at desc).limit(1) binnen (meeting_id, prompt_version). '
  'Drop zodra observability via agent_runs + dashboards volwaardig is.';

-- RLS: authenticated users mogen lezen (admin-dashboard/harness). Insert
-- via service role client. Zelfde pattern als experimental_risk_extractions.
ALTER TABLE experimental_action_item_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY experimental_action_item_extractions_read
  ON experimental_action_item_extractions
  FOR SELECT
  TO authenticated
  USING (true);

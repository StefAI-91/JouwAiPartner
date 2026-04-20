-- RiskSpecialist-experiment: aparte tabel om parallel-uitgevoerde Haiku-run
-- op te slaan naast MeetingStructurer-output. De UI blijft op de
-- MeetingStructurer-extractions staan; deze tabel is puur voor A/B-analyse
-- op de 6 referentie-meetings voordat we een pipeline-switch overwegen.
--
-- Eén rij per (meeting, prompt_version) zodat re-runs bij prompt-verandering
-- niet oude data overschrijven — we willen versie-naar-versie-diffs kunnen
-- maken.

CREATE TABLE IF NOT EXISTS experimental_risk_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Welk model + prompt-versie heeft deze run gemaakt. Vereist voor eerlijke
  -- vergelijking: een run op v1 van de prompt is niet hetzelfde als v2.
  model text NOT NULL,
  prompt_version text NOT NULL,

  -- Structured output. JSONB i.p.v. aparte kolommen: dit is een experiment,
  -- we willen geen schema-migraties bij elke promptwijziging.
  risks jsonb NOT NULL,

  -- Metrics voor A/B-rapport.
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  reasoning_tokens integer,

  -- Als de agent faalde: fout-bericht + null in risks. Niet-failure is
  -- risks='[]' + error=null (agent liep door, geen risks gevonden).
  error text,

  UNIQUE (meeting_id, prompt_version, created_at)
);

CREATE INDEX IF NOT EXISTS experimental_risk_extractions_meeting_idx
  ON experimental_risk_extractions(meeting_id, created_at DESC);

COMMENT ON TABLE experimental_risk_extractions IS
  'A/B-experiment: RiskSpecialist-agent (Haiku, risk-only) output naast de ' ||
  'MeetingStructurer-pipeline. Tijdelijk — drop zodra besloten is welk pad ' ||
  'in productie blijft.';

-- RLS: authenticated users mogen lezen (admin-dashboard/harness). Insert via
-- service role client. Geen fine-grained permissions nodig — het is intern
-- experimentele data.
ALTER TABLE experimental_risk_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY experimental_risk_extractions_read
  ON experimental_risk_extractions
  FOR SELECT
  TO authenticated
  USING (true);

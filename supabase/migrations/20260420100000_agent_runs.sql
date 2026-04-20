-- Centraal run-log voor ALLE AI-agents in de pipeline. Vervangt het ad-hoc
-- patroon waarbij alleen experimental_risk_extractions metrics bewaarde.
-- Elke agent run (gatekeeper, extractor, classifier, etc.) schrijft hier
-- één rij, zodat we op de /agents pagina accurate runs-today / last-run /
-- kosten / latency / error-rate kunnen tonen per agent.
--
-- Append-only, geen updates — als je een run wilt corrigeren, schrijf je een
-- nieuwe rij. Zo houden we een volledige audit trail.

CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Identificatie: welke agent (kebab-case, bijv. "gatekeeper", "extractor",
  -- "issue-classifier") en welk model + evt. prompt-versie.
  agent_name text NOT NULL,
  model text NOT NULL,
  prompt_version text,

  -- Status van de run. Alleen "success" of "error" — "blocked" of andere
  -- inhoudelijke uitkomsten horen in metadata, niet hier.
  status text NOT NULL CHECK (status IN ('success', 'error')),

  -- Timing + token-gebruik voor kosten-berekening en latency-tracking.
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  reasoning_tokens integer,
  cached_tokens integer,

  -- Bij status='error': de foutmelding. Bij status='success': null.
  error_message text,

  -- Agent-specifieke context zonder schema-wijziging: meeting_id, issue_id,
  -- email_id, project_id — wat relevant is voor de betreffende agent. Zo
  -- kan de UI later door-klikken vanuit een run naar de bron.
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Per-agent recent-runs lookup (de meest voorkomende query op de /agents
-- pagina: "geef me de laatste run en de runs van vandaag voor deze agent").
CREATE INDEX IF NOT EXISTS agent_runs_agent_created_idx
  ON agent_runs(agent_name, created_at DESC);

-- Globale recent-runs feed (voor de activity-strook op de /agents pagina).
CREATE INDEX IF NOT EXISTS agent_runs_created_idx
  ON agent_runs(created_at DESC);

COMMENT ON TABLE agent_runs IS
  'Centraal run-log voor alle AI-agents. Append-only. Voedt de /agents ' ||
  'observability pagina met runs, kosten, latency en error-rate per agent.';

-- RLS: authenticated mag lezen (admin-pagina). Insert via service role
-- client vanuit de pipeline. Geen fine-grained policies — admin-only UI.
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_runs_read
  ON agent_runs
  FOR SELECT
  TO authenticated
  USING (true);

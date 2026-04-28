-- PR-001: Topics database foundation — topics-tabel
-- PR-DATA-001..006, PR-RULE-002
--
-- Topics zijn de curatielaag tussen issues (klant-feedback) en reports
-- (klant-rapportage). Statuses volgen de 8-state lifecycle uit
-- prd-portal-roadmap §11.7. target_sprint_id is in v1 een tekstveld
-- (geen sprints-tabel aanwezig — zie I-5 in §13.3).

CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  client_title text,
  description text,
  client_description text,
  type text NOT NULL CHECK (type IN ('bug', 'feature')),
  status text NOT NULL DEFAULT 'clustering'
    CHECK (status IN (
      'clustering',
      'awaiting_client_input',
      'prioritized',
      'scheduled',
      'in_progress',
      'done',
      'wont_do',
      'wont_do_proposed_by_client'
    )),
  priority text CHECK (priority IS NULL OR priority IN ('P0', 'P1', 'P2', 'P3')),
  target_sprint_id text,
  status_overridden boolean NOT NULL DEFAULT false,
  wont_do_reason text,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- closed_at moet gevuld zijn voor terminale statuses (zachte garantie in fase 1).
  CONSTRAINT topics_closed_at_when_terminal CHECK (
    status NOT IN ('done', 'wont_do', 'wont_do_proposed_by_client')
    OR closed_at IS NOT NULL
  )
);

-- Auto-bijwerken van updated_at — set_updated_at()-trigger-functie bestaat al
-- (zie 20260409100005_devhub_quality_fixes.sql en eerder).
DROP TRIGGER IF EXISTS topics_set_updated_at ON topics;
CREATE TRIGGER topics_set_updated_at
  BEFORE UPDATE ON topics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- CP-012: Project-sprints en portal-communicatie — sprints-tabel
-- CP-REQ-130, CP-REQ-131, CP-REQ-132
--
-- Sprints zijn eerste-klasse entiteit per klantproject, voor expliciete
-- planning en klant-communicatie via de portal. Eén project heeft N sprints
-- (variabel), elk met een opleverweek en samenvatting. Status volgt een
-- driewaardige lifecycle (planned/in_progress/delivered) — geen auto-rollup
-- in v1, team zet handmatig.
--
-- Verving van het tijdelijke `topics.target_sprint_id text` veld gebeurt in
-- de volgende migratie (20260503110000_topics_origin_and_sprint_fk.sql).
--
-- RLS-pattern volgt 20260428100002_topics_rls.sql: helpers `is_client(uid)`
-- en `has_portal_access(uid, pid)` (uit 20260417100002_portal_rls_policies)
-- doen het zware werk. Klanten lezen sprints op hun eigen projecten;
-- schrijven blijft admin/member-only.

CREATE TABLE IF NOT EXISTS sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  delivery_week date NOT NULL,
  summary text,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'delivered')),
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- delivery_week moet een maandag zijn — week-granulariteit op DB-niveau
  -- afgedwongen zodat application-bugs niet stilletjes andere weekdagen
  -- accepteren. EXTRACT(DOW FROM ...) = 1 => maandag in Postgres.
  CONSTRAINT sprints_delivery_week_is_monday
    CHECK (EXTRACT(DOW FROM delivery_week) = 1)
);

CREATE INDEX IF NOT EXISTS idx_sprints_project_order
  ON sprints(project_id, order_index);

CREATE INDEX IF NOT EXISTS idx_sprints_project_status
  ON sprints(project_id, status);

-- updated_at trigger — set_updated_at() bestaat al sinds devhub_quality_fixes.
DROP TRIGGER IF EXISTS sprints_set_updated_at ON sprints;
CREATE TRIGGER sprints_set_updated_at
  BEFORE UPDATE ON sprints
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- RLS — clients SELECT via has_portal_access; writes admin/member only.
-- =============================================================================

ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sprints: select (role-aware)" ON sprints;
DROP POLICY IF EXISTS "Sprints: insert (admin/member only)" ON sprints;
DROP POLICY IF EXISTS "Sprints: update (admin/member only)" ON sprints;
DROP POLICY IF EXISTS "Sprints: delete (admin/member only)" ON sprints;

CREATE POLICY "Sprints: select (role-aware)"
  ON sprints FOR SELECT TO authenticated
  USING (
    NOT is_client(auth.uid())
    OR has_portal_access(auth.uid(), project_id)
  );

CREATE POLICY "Sprints: insert (admin/member only)"
  ON sprints FOR INSERT TO authenticated
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Sprints: update (admin/member only)"
  ON sprints FOR UPDATE TO authenticated
  USING (NOT is_client(auth.uid()))
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Sprints: delete (admin/member only)"
  ON sprints FOR DELETE TO authenticated
  USING (NOT is_client(auth.uid()));

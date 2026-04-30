-- WG-004: Audit events
-- Algemene audit-trail tabel voor admin-mutaties die niet aan een issue
-- vasthangen (issue-mutaties hebben hun eigen `issue_activity`-tabel).
-- Eerste use-case: whitelist-mutaties op `widget_allowed_projects`. Latere
-- use-cases kunnen hier op aanhaken zonder per domein een eigen log-tabel
-- te bouwen.

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  -- target_id is text zodat verschillende event-types naar verschillende
  -- tabellen kunnen wijzen (project_id voor whitelist, issue_id voor andere
  -- events). UUID-cast is dan applicatie-zaak. Geen FK om zwakke koppeling
  -- te houden — een audit-rij overleeft de target.
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_event_type ON audit_events(event_type, created_at DESC);
CREATE INDEX idx_audit_events_actor ON audit_events(actor_id, created_at DESC);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Alleen admins lezen audit-trail. Service-role schrijft (vanuit server
-- actions die zelf een isAdmin-check doen). Geen INSERT-policy voor
-- authenticated → forceert dat audit-rijen via de helper geschreven
-- worden (admin-client) en niet door een client-bypass.
CREATE POLICY "Audit events: admin read"
  ON audit_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

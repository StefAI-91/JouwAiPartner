-- CP-012 follow-up: hardening sprints-SELECT-policy voor clients.
--
-- Originele policy (20260503100000_create_sprints.sql) gaf clients toegang
-- tot álle sprints op hun project — inclusief `planned` waar het team nog
-- aan de summary werkt. Symmetrie met topics-policy (`status <> 'clustering'`)
-- ontbrak.
--
-- Nieuwe regel: clients zien alleen sprints in `in_progress` (banner) of
-- `delivered` (testlijst). `planned` blijft intern tot het team de sprint
-- expliciet activeert.

DROP POLICY IF EXISTS "Sprints: select (role-aware)" ON sprints;

CREATE POLICY "Sprints: select (role-aware)"
  ON sprints FOR SELECT TO authenticated
  USING (
    NOT is_client(auth.uid())
    OR (
      has_portal_access(auth.uid(), project_id)
      AND status IN ('in_progress', 'delivered')
    )
  );

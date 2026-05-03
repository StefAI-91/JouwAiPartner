-- CC-006: Vrije messaging — klant mag root-berichten starten
--
-- Vóór deze migratie blokkeerde PR-SEC-031 elke root-INSERT door een klant
-- ("root alleen team"). Voor de vrije messaging-flow moet een klant met
-- portal-access op een project een root-bericht kunnen starten naar het team.
-- De org-isolatie blijft strikt: een klant met multi-project-access mag niet
-- root-inserten op een project van een andere klant-organisatie.
--
-- Reply-pad blijft ongewijzigd t.o.v. PR-SEC-031.

DROP POLICY IF EXISTS "Client questions: insert (root team / reply role-aware)" ON client_questions;

CREATE POLICY "Client questions: insert (root + reply role-aware)"
  ON client_questions FOR INSERT TO authenticated
  WITH CHECK (
    CASE
      WHEN parent_id IS NULL THEN
        -- Root: team altijd, klant alleen op project waar zij portal-access
        -- op heeft + matching organization (multi-tenant guard).
        NOT is_client(auth.uid())
        OR (
          has_portal_access(auth.uid(), project_id)
          AND organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        )
      ELSE
        -- Reply: ongewijzigd t.o.v. PR-SEC-031.
        NOT is_client(auth.uid())
        OR EXISTS (
          SELECT 1 FROM client_questions p
          WHERE p.id = parent_id
            AND has_portal_access(auth.uid(), p.project_id)
            AND p.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        )
    END
  );

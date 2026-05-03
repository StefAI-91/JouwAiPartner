-- CC-007 — SECURITY DEFINER hardening (B3 + B4)
--
-- Voortzetting van CC-006 (`20260503110000_cc006_fix_recursive_policy.sql`):
-- de helper `client_question_reply_visible` had twee scherpe randjes die we
-- nu glad maken voordat klanten extra rechten krijgen.
--
--   B3. `SET search_path = public` is onvoldoende. Een SECURITY DEFINER-functie
--       moet OOK `pg_catalog` pinnen, anders kan een aanvaller met INSERT-recht
--       op `public` een eigen `pg_catalog`-shadow plaatsen en de helper hijacken.
--   B4. De oude signature `(user_id UUID, parent UUID)` accepteerde een willekeurige
--       user-uuid van de caller. Dat maakt de helper een boolean-oracle: een
--       klant kan voor *elke* user-id testen of een parent zichtbaar zou zijn.
--       De nieuwe signature haalt `auth.uid()` intern op — de caller heeft geen
--       speech-act meer over wie er gecheckt wordt.
--
-- Migration moet idempotent zijn (CI-replay) en mag de bestaande RLS-policy
-- niet ongedaan maken. We droppen de policy + functie expliciet en bouwen
-- ze in dezelfde transactie weer op met de gehardende signature.

-- =============================================================================
-- B4 — helper-signature refactor
-- =============================================================================

-- Drop oude policy eerst (hangt aan de oude signature).
DROP POLICY IF EXISTS "Client questions: insert reply" ON client_questions;

-- Drop oude signature; CASCADE niet nodig — we hebben de policy zojuist gedropt.
DROP FUNCTION IF EXISTS client_question_reply_visible(UUID, UUID);

-- Nieuwe signature: alleen `parent`, gebruikt `auth.uid()` intern.
CREATE FUNCTION client_question_reply_visible(parent UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM client_questions p
    WHERE p.id = parent
      AND has_portal_access(auth.uid(), p.project_id)
      AND p.organization_id = (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
  );
$$;

REVOKE ALL ON FUNCTION client_question_reply_visible(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION client_question_reply_visible(UUID) TO authenticated;

COMMENT ON FUNCTION client_question_reply_visible(UUID) IS
  'CC-007: helper neemt geen user_id-parameter meer; gebruikt auth.uid() intern. Voorkomt boolean-oracle.';

-- Recreate de reply-policy met de nieuwe signature.
CREATE POLICY "Client questions: insert reply"
  ON client_questions FOR INSERT TO authenticated
  WITH CHECK (
    parent_id IS NOT NULL
    AND (
      NOT is_client(auth.uid())
      OR client_question_reply_visible(parent_id)
    )
  );

-- =============================================================================
-- B3 — search_path-pinning op aanverwante helpers
-- =============================================================================
--
-- Zelfde hijack-vector geldt voor `is_client` en `has_portal_access`. Beide
-- zijn al SECURITY DEFINER (zie eerdere portal-migration); we pinnen nu ook
-- expliciet `pg_catalog` voor consistentie.

ALTER FUNCTION is_client(UUID) SET search_path = pg_catalog, public;
ALTER FUNCTION has_portal_access(UUID, UUID) SET search_path = pg_catalog, public;

-- CP-012 follow-up: sprints worden direct testbaar + origin auto-derive
--
-- Twee veranderingen:
-- 1. `sprints.client_test_instructions` — sprint-niveau test-instructies
--    voor de portal "Klaar om te testen"-sectie. Een sprint zonder
--    instructies blijft daar onzichtbaar (zelfde forced-ritual als topics).
--
-- 2. Trigger op topics: zet `origin` automatisch o.b.v. `target_sprint_id`.
--    Voorkomt dat het team handmatig moet onthouden om origin='sprint' te
--    zetten als ze een topic aan een sprint koppelen. Wanneer zij een topic
--    expliciet als 'production' willen ondanks koppeling — UPDATE de
--    origin-kolom direct (de trigger overschrijft alleen bij INSERT en bij
--    UPDATE waarbij target_sprint_id zelf wijzigt; expliciete origin-update
--    blijft staan).

-- 1. Sprint-instructies kolom.
ALTER TABLE sprints
  ADD COLUMN IF NOT EXISTS client_test_instructions text;

-- 2. Topics origin-derive trigger.
CREATE OR REPLACE FUNCTION topics_derive_origin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Alleen aanpassen wanneer target_sprint_id wijzigt (INSERT of relevante
  -- UPDATE). Een directe UPDATE op alleen origin blijft onaangetast.
  IF TG_OP = 'INSERT'
     OR (TG_OP = 'UPDATE' AND NEW.target_sprint_id IS DISTINCT FROM OLD.target_sprint_id)
  THEN
    IF NEW.target_sprint_id IS NOT NULL THEN
      NEW.origin := 'sprint';
    ELSE
      NEW.origin := 'production';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS topics_derive_origin_trigger ON topics;
CREATE TRIGGER topics_derive_origin_trigger
  BEFORE INSERT OR UPDATE ON topics
  FOR EACH ROW EXECUTE FUNCTION topics_derive_origin();

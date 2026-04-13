-- DH-013: Access control — DB fundering
-- AUTH-150..154, DATA-200..202, RULE-150
--
-- Rollen leven uitsluitend op `profiles.role` (exact twee: 'admin' | 'member').
-- `devhub_project_access` wordt een pure koppeltabel zonder rol-kolom.
-- Stef en Wouter worden geseed als admin. Minimaal één admin is DB-garantie.

-- =============================================================================
-- DATA-200: Drop `role` kolom op devhub_project_access (pure koppeltabel)
-- =============================================================================
ALTER TABLE devhub_project_access DROP COLUMN IF EXISTS role;

-- =============================================================================
-- DATA-201 / AUTH-154: Normaliseer bestaande rol-waarden, dan CHECK constraint
-- =============================================================================
UPDATE profiles
SET role = 'member'
WHERE role IS NULL OR role NOT IN ('admin', 'member');

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'member'));

ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'member';

-- =============================================================================
-- AUTH-153: Seed Stef + Wouter als admin (idempotent — UPDATE op email)
-- =============================================================================
UPDATE profiles
SET role = 'admin'
WHERE email IN ('stef@jouwaipartner.nl', 'wouter@jouwaipartner.nl');

-- =============================================================================
-- DATA-202 / RULE-150: Min-1-admin trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION enforce_min_one_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  remaining_admins INT;
BEGIN
  -- Alleen relevant als de oude rol admin was en deze operatie de admin-status wegneemt.
  IF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'admin' AND NEW.role <> 'admin' THEN
      SELECT COUNT(*) INTO remaining_admins
      FROM profiles
      WHERE role = 'admin' AND id <> OLD.id;

      IF remaining_admins < 1 THEN
        RAISE EXCEPTION 'Cannot demote the last admin (profile id=%). At least one admin must remain.', OLD.id
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'admin' THEN
      SELECT COUNT(*) INTO remaining_admins
      FROM profiles
      WHERE role = 'admin' AND id <> OLD.id;

      IF remaining_admins < 1 THEN
        RAISE EXCEPTION 'Cannot delete the last admin (profile id=%). At least one admin must remain.', OLD.id
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS enforce_min_one_admin_update ON profiles;
CREATE TRIGGER enforce_min_one_admin_update
  BEFORE UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_min_one_admin();

DROP TRIGGER IF EXISTS enforce_min_one_admin_delete ON profiles;
CREATE TRIGGER enforce_min_one_admin_delete
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_min_one_admin();

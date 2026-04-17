-- CP-001: Portal MVP — client role + organization_id on profiles
-- AUTH-P01, RLS-P06
--
-- Extends `profiles.role` CHECK to accept 'client' alongside 'admin' and
-- 'member'. Clients are portal users — invite-only accounts tied to one
-- organization. Existing admin/member users are not touched.

-- =============================================================================
-- AUTH-P01: extend role CHECK constraint
-- =============================================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'member', 'client'));

-- =============================================================================
-- Add organization_id to profiles (only relevant for client users)
-- =============================================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS organization_id UUID
  REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id
  ON profiles(organization_id)
  WHERE organization_id IS NOT NULL;

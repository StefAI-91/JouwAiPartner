-- Sprint 034: E-mail-koppeling aan adviseurs
-- Nieuwe kolom organizations.email_domains voor domain-based email matching.
-- Covered requirements: DATA-058, DATA-059

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS email_domains TEXT[] DEFAULT '{}';

-- GIN index voor snelle lookups (waar domein in array zit)
CREATE INDEX IF NOT EXISTS idx_organizations_email_domains
  ON organizations USING GIN (email_domains);

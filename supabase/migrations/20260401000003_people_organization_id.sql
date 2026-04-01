-- Add organization_id to people table for external contact classification
-- Internal team members: organization_id = own org or NULL + team IS NOT NULL
-- External contacts: organization_id = their org, team IS NULL

ALTER TABLE people
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX idx_people_organization_id ON people (organization_id) WHERE organization_id IS NOT NULL;

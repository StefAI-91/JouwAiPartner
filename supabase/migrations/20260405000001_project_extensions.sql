-- Extend projects table with fields needed for project detail page:
-- description, owner, contact person, start date, and deadline.

ALTER TABLE projects
  ADD COLUMN description TEXT,
  ADD COLUMN owner_id UUID REFERENCES people(id),
  ADD COLUMN contact_person_id UUID REFERENCES people(id),
  ADD COLUMN start_date DATE,
  ADD COLUMN deadline DATE;

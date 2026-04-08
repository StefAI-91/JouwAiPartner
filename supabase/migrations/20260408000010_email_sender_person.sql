-- Email Labeling — Add sender_person_id to link emails to known people
-- Allows reviewers to identify the sender as a known person from the people table

ALTER TABLE emails ADD COLUMN sender_person_id UUID REFERENCES people(id) ON DELETE SET NULL;

CREATE INDEX idx_emails_sender_person_id ON emails(sender_person_id);

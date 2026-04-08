-- Fix: Add automatic updated_at trigger for emails table
-- Prevents stale updated_at when mutations forget to set it manually

CREATE EXTENSION IF NOT EXISTS moddatetime;

CREATE TRIGGER set_emails_updated_at
  BEFORE UPDATE ON emails
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

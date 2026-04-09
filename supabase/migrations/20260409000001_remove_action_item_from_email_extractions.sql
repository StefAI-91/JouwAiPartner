-- Remove action_item from email extractions type constraint
-- Action items/tasks should only come from meetings, not emails

-- Drop old constraint and add updated one without action_item
ALTER TABLE email_extractions
  DROP CONSTRAINT email_extractions_type_check;

ALTER TABLE email_extractions
  ADD CONSTRAINT email_extractions_type_check CHECK (
    type IN ('decision', 'need', 'insight', 'project_update', 'request')
  );

-- Clean up any existing action_item extractions from emails
-- Convert them to 'insight' to preserve the information
UPDATE email_extractions
  SET type = 'insight'
  WHERE type = 'action_item';

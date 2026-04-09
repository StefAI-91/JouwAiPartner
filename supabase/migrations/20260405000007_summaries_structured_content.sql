-- Add structured_content JSONB column to summaries table.
-- Used to store structured AI output like project timelines alongside the text content.
ALTER TABLE summaries ADD COLUMN structured_content JSONB;

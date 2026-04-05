-- Extend summaries table to support company-wide weekly summaries.
-- Allow 'company' as entity_type and 'weekly' as summary_type.

ALTER TABLE summaries DROP CONSTRAINT IF EXISTS summaries_entity_type_check;
ALTER TABLE summaries ADD CONSTRAINT summaries_entity_type_check
  CHECK (entity_type IN ('project', 'organization', 'company'));

ALTER TABLE summaries DROP CONSTRAINT IF EXISTS summaries_summary_type_check;
ALTER TABLE summaries ADD CONSTRAINT summaries_summary_type_check
  CHECK (summary_type IN ('context', 'briefing', 'weekly'));

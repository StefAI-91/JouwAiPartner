-- Validate that entity_id references an existing row in the correct table.
-- Uses a trigger instead of FK columns to avoid restructuring the polymorphic design.

CREATE OR REPLACE FUNCTION validate_summary_entity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entity_type = 'project' THEN
    IF NOT EXISTS (SELECT 1 FROM projects WHERE id = NEW.entity_id) THEN
      RAISE EXCEPTION 'Project % does not exist', NEW.entity_id;
    END IF;
  ELSIF NEW.entity_type = 'organization' THEN
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = NEW.entity_id) THEN
      RAISE EXCEPTION 'Organization % does not exist', NEW.entity_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER summaries_validate_entity
  BEFORE INSERT OR UPDATE ON summaries
  FOR EACH ROW
  EXECUTE FUNCTION validate_summary_entity();

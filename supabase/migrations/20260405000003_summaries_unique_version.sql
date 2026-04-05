-- Fix race condition in summary versioning by adding a unique constraint.
-- If two concurrent inserts try to create the same version, one will fail
-- and can be retried.

ALTER TABLE summaries
  ADD CONSTRAINT summaries_entity_version_unique
  UNIQUE (entity_type, entity_id, summary_type, version);

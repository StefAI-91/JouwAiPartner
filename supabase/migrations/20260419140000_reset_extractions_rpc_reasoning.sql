-- Update reset_extractions_for_meeting om de nieuwe reasoning-kolom mee
-- te nemen bij INSERT. Eerste versie (20260419110000) had reasoning nog
-- niet — deze migratie vervangt de functie via CREATE OR REPLACE zodat de
-- kolom bij elke re-run correct wordt ingevuld.
--
-- Gedrag is verder identiek: DELETE + INSERT voor alle extractions van
-- één meeting in één transactie. reasoning is nullable zodat callers die
-- het veld (nog) niet leveren geen fout krijgen.

CREATE OR REPLACE FUNCTION reset_extractions_for_meeting(
  p_meeting_id uuid,
  p_rows jsonb
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  inserted_count integer;
BEGIN
  DELETE FROM extractions WHERE meeting_id = p_meeting_id;

  INSERT INTO extractions (
    meeting_id,
    type,
    content,
    confidence,
    transcript_ref,
    metadata,
    project_id,
    embedding_stale,
    verification_status,
    follow_up_context,
    reasoning
  )
  SELECT
    (row_data->>'meeting_id')::uuid,
    row_data->>'type',
    row_data->>'content',
    (row_data->>'confidence')::numeric,
    row_data->>'transcript_ref',
    COALESCE(row_data->'metadata', '{}'::jsonb),
    NULLIF(row_data->>'project_id', '')::uuid,
    COALESCE((row_data->>'embedding_stale')::boolean, true),
    COALESCE(row_data->>'verification_status', 'draft'),
    row_data->>'follow_up_context',
    row_data->>'reasoning'
  FROM jsonb_array_elements(p_rows) AS row_data;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

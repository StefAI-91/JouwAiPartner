-- Fix: Allow reviewers to reject individual extractions and change extraction types
-- during the review flow. Previously, deleted extractions in the UI were silently
-- verified along with the rest.

CREATE OR REPLACE FUNCTION verify_meeting(
  p_meeting_id uuid,
  p_user_id uuid,
  p_edits jsonb DEFAULT '[]'::jsonb,
  p_rejected_ids uuid[] DEFAULT '{}'::uuid[],
  p_type_changes jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edit jsonb;
  edit_id uuid;
  edit_content text;
  edit_metadata jsonb;
  type_change jsonb;
  tc_id uuid;
  tc_type text;
BEGIN
  -- 1. Apply content/metadata edits
  FOR edit IN SELECT * FROM jsonb_array_elements(p_edits)
  LOOP
    edit_id := (edit->>'extractionId')::uuid;
    edit_content := edit->>'content';
    edit_metadata := edit->'metadata';

    IF edit_content IS NOT NULL THEN
      UPDATE extractions SET content = edit_content, corrected_by = p_user_id, corrected_at = now()
      WHERE id = edit_id AND meeting_id = p_meeting_id;
    END IF;

    IF edit_metadata IS NOT NULL THEN
      UPDATE extractions SET metadata = edit_metadata
      WHERE id = edit_id AND meeting_id = p_meeting_id;
    END IF;
  END LOOP;

  -- 2. Apply type changes
  FOR type_change IN SELECT * FROM jsonb_array_elements(p_type_changes)
  LOOP
    tc_id := (type_change->>'extractionId')::uuid;
    tc_type := type_change->>'type';

    UPDATE extractions SET type = tc_type, corrected_by = p_user_id, corrected_at = now()
    WHERE id = tc_id AND meeting_id = p_meeting_id;
  END LOOP;

  -- 3. Reject individual extractions the reviewer deleted
  IF array_length(p_rejected_ids, 1) > 0 THEN
    UPDATE extractions
    SET verification_status = 'rejected',
        verified_by = p_user_id,
        verified_at = now()
    WHERE id = ANY(p_rejected_ids)
      AND meeting_id = p_meeting_id
      AND verification_status = 'draft';
  END IF;

  -- 4. Verify the meeting
  UPDATE meetings
  SET verification_status = 'verified',
      verified_by = p_user_id,
      verified_at = now()
  WHERE id = p_meeting_id
    AND verification_status = 'draft';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meeting % not found or not in draft status', p_meeting_id;
  END IF;

  -- 5. Verify remaining draft extractions (excluding already rejected ones)
  UPDATE extractions
  SET verification_status = 'verified',
      verified_by = p_user_id,
      verified_at = now()
  WHERE meeting_id = p_meeting_id
    AND verification_status = 'draft';
END;
$$;

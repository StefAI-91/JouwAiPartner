-- Email Integration — Migratie 5: Email review RPC functions
-- Verify/reject emails with extraction edits (same pattern as meetings)

-- Verify email + its extractions atomically
CREATE OR REPLACE FUNCTION verify_email(
  p_email_id uuid,
  p_user_id uuid,
  p_edits jsonb DEFAULT '[]'::jsonb,
  p_rejected_ids uuid[] DEFAULT '{}'::uuid[],
  p_type_changes jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_edit jsonb;
  v_type_change jsonb;
BEGIN
  -- Apply content edits
  FOR v_edit IN SELECT * FROM jsonb_array_elements(p_edits)
  LOOP
    UPDATE email_extractions
    SET
      content = COALESCE(v_edit->>'content', content),
      metadata = CASE
        WHEN v_edit->'metadata' IS NOT NULL AND v_edit->'metadata' != 'null'::jsonb
        THEN v_edit->'metadata'
        ELSE metadata
      END,
      corrected_by = p_user_id,
      corrected_at = NOW(),
      embedding_stale = TRUE
    WHERE id = (v_edit->>'extractionId')::uuid
      AND email_id = p_email_id;
  END LOOP;

  -- Apply type changes
  FOR v_type_change IN SELECT * FROM jsonb_array_elements(p_type_changes)
  LOOP
    UPDATE email_extractions
    SET
      type = v_type_change->>'type',
      corrected_by = p_user_id,
      corrected_at = NOW()
    WHERE id = (v_type_change->>'extractionId')::uuid
      AND email_id = p_email_id;
  END LOOP;

  -- Reject specified extractions
  UPDATE email_extractions
  SET verification_status = 'rejected',
      verified_by = p_user_id,
      verified_at = NOW()
  WHERE id = ANY(p_rejected_ids)
    AND email_id = p_email_id;

  -- Verify remaining extractions
  UPDATE email_extractions
  SET verification_status = 'verified',
      verified_by = p_user_id,
      verified_at = NOW()
  WHERE email_id = p_email_id
    AND verification_status = 'draft';

  -- Verify the email itself
  UPDATE emails
  SET verification_status = 'verified',
      verified_by = p_user_id,
      verified_at = NOW(),
      updated_at = NOW()
  WHERE id = p_email_id;
END;
$$;

-- Reject email + all its extractions
CREATE OR REPLACE FUNCTION reject_email(
  p_email_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Reject all extractions
  UPDATE email_extractions
  SET verification_status = 'rejected',
      verified_by = p_user_id,
      verified_at = NOW()
  WHERE email_id = p_email_id;

  -- Reject the email
  UPDATE emails
  SET verification_status = 'rejected',
      verified_by = p_user_id,
      verified_at = NOW(),
      updated_at = NOW()
  WHERE id = p_email_id;
END;
$$;

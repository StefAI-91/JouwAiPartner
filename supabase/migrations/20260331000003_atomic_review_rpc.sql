-- SEC-02: Atomic review transaction RPCs.
-- Replaces non-atomic individual UPDATE calls with single-transaction functions.

-- ── Verify meeting + extractions atomically ──
CREATE OR REPLACE FUNCTION verify_meeting(
  p_meeting_id uuid,
  p_user_id uuid,
  p_edits jsonb DEFAULT '[]'::jsonb
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
BEGIN
  -- Apply edits to individual extractions (if any)
  FOR edit IN SELECT * FROM jsonb_array_elements(p_edits)
  LOOP
    edit_id := (edit->>'extractionId')::uuid;
    edit_content := edit->>'content';
    edit_metadata := edit->'metadata';

    IF edit_content IS NOT NULL THEN
      UPDATE extractions SET content = edit_content
      WHERE id = edit_id AND meeting_id = p_meeting_id;
    END IF;

    IF edit_metadata IS NOT NULL THEN
      UPDATE extractions SET metadata = edit_metadata
      WHERE id = edit_id AND meeting_id = p_meeting_id;
    END IF;
  END LOOP;

  -- Verify the meeting
  UPDATE meetings
  SET verification_status = 'verified',
      verified_by = p_user_id,
      verified_at = now()
  WHERE id = p_meeting_id
    AND verification_status = 'draft';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meeting % not found or not in draft status', p_meeting_id;
  END IF;

  -- Verify all extractions
  UPDATE extractions
  SET verification_status = 'verified',
      verified_by = p_user_id,
      verified_at = now()
  WHERE meeting_id = p_meeting_id
    AND verification_status = 'draft';
END;
$$;

-- ── Reject meeting + extractions atomically ──
CREATE OR REPLACE FUNCTION reject_meeting(
  p_meeting_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE meetings
  SET verification_status = 'rejected',
      verified_by = p_user_id,
      verified_at = now()
  WHERE id = p_meeting_id
    AND verification_status = 'draft';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meeting % not found or not in draft status', p_meeting_id;
  END IF;

  UPDATE extractions
  SET verification_status = 'rejected',
      verified_by = p_user_id,
      verified_at = now()
  WHERE meeting_id = p_meeting_id
    AND verification_status = 'draft';
END;
$$;

-- ── Batch update embeddings atomically ──
CREATE OR REPLACE FUNCTION batch_update_embeddings(
  p_table text,
  p_ids uuid[],
  p_embeddings vector(1024)[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  i int;
BEGIN
  FOR i IN 1..array_length(p_ids, 1)
  LOOP
    EXECUTE format(
      'UPDATE %I SET embedding = $1, embedding_stale = false WHERE id = $2',
      p_table
    ) USING p_embeddings[i], p_ids[i];
  END LOOP;
END;
$$;

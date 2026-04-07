-- Fix C3: removeSegmentTag als atomaire database transactie
-- Verplaatst kernpunten/vervolgstappen naar het Algemeen segment en verwijdert het bronsegment.

CREATE OR REPLACE FUNCTION merge_segment_to_general(
  p_segment_id UUID,
  p_meeting_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_segment RECORD;
  v_general RECORD;
  v_merged_kernpunten TEXT[];
  v_merged_vervolgstappen TEXT[];
  v_summary_text TEXT;
  v_general_id UUID;
BEGIN
  -- 1. Haal het te verwijderen segment op
  SELECT id, kernpunten, vervolgstappen
  INTO v_segment
  FROM meeting_project_summaries
  WHERE id = p_segment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Segment niet gevonden');
  END IF;

  -- 2. Zoek bestaand Algemeen segment (project_id IS NULL)
  SELECT id, kernpunten, vervolgstappen, summary_text
  INTO v_general
  FROM meeting_project_summaries
  WHERE meeting_id = p_meeting_id
    AND project_id IS NULL
    AND id != p_segment_id
  LIMIT 1;

  IF FOUND THEN
    -- 3a. Merge in bestaand Algemeen segment
    v_merged_kernpunten := COALESCE(v_general.kernpunten, '{}') || COALESCE(v_segment.kernpunten, '{}');
    v_merged_vervolgstappen := COALESCE(v_general.vervolgstappen, '{}') || COALESCE(v_segment.vervolgstappen, '{}');
    v_summary_text := 'Algemeen (niet project-specifiek):';

    IF array_length(v_merged_kernpunten, 1) > 0 THEN
      v_summary_text := v_summary_text || E'\nKernpunten:';
      FOR i IN 1..array_length(v_merged_kernpunten, 1) LOOP
        v_summary_text := v_summary_text || E'\n- ' || v_merged_kernpunten[i];
      END LOOP;
    END IF;

    IF array_length(v_merged_vervolgstappen, 1) > 0 THEN
      v_summary_text := v_summary_text || E'\nVervolgstappen:';
      FOR i IN 1..array_length(v_merged_vervolgstappen, 1) LOOP
        v_summary_text := v_summary_text || E'\n- ' || v_merged_vervolgstappen[i];
      END LOOP;
    END IF;

    UPDATE meeting_project_summaries
    SET kernpunten = v_merged_kernpunten,
        vervolgstappen = v_merged_vervolgstappen,
        summary_text = v_summary_text,
        embedding_stale = true
    WHERE id = v_general.id;

    v_general_id := v_general.id;
  ELSE
    -- 3b. Maak nieuw Algemeen segment
    v_summary_text := 'Algemeen (niet project-specifiek):';

    IF array_length(v_segment.kernpunten, 1) > 0 THEN
      v_summary_text := v_summary_text || E'\nKernpunten:';
      FOR i IN 1..array_length(v_segment.kernpunten, 1) LOOP
        v_summary_text := v_summary_text || E'\n- ' || v_segment.kernpunten[i];
      END LOOP;
    END IF;

    IF array_length(v_segment.vervolgstappen, 1) > 0 THEN
      v_summary_text := v_summary_text || E'\nVervolgstappen:';
      FOR i IN 1..array_length(v_segment.vervolgstappen, 1) LOOP
        v_summary_text := v_summary_text || E'\n- ' || v_segment.vervolgstappen[i];
      END LOOP;
    END IF;

    INSERT INTO meeting_project_summaries (meeting_id, project_id, project_name_raw, kernpunten, vervolgstappen, summary_text, embedding_stale)
    VALUES (p_meeting_id, NULL, NULL, COALESCE(v_segment.kernpunten, '{}'), COALESCE(v_segment.vervolgstappen, '{}'), v_summary_text, true)
    RETURNING id INTO v_general_id;
  END IF;

  -- 4. Verwijder het bronsegment
  DELETE FROM meeting_project_summaries WHERE id = p_segment_id;

  RETURN jsonb_build_object('success', true, 'general_id', v_general_id);
END;
$$;

-- PW-QC-02 (D4): idempotency RPC voor MeetingStructurer-extracties.
--
-- Probleem: `saveStructuredExtractions` deed een plain INSERT zonder
-- dedup. Re-run van de pipeline op dezelfde meeting (bijv. na
-- prompt-verandering of bij reprocess) gaf dubbele rows — een kernpunt
-- dat in run 1 en run 2 hetzelfde is, staat 2x in `extractions`.
--
-- Oplossing: RPC `reset_extractions_for_meeting(meeting_id, rows jsonb)`
-- doet DELETE + INSERT in één transactie. PL/pgSQL-blok is atomair:
-- bij een crash tussen DELETE en INSERT wordt de hele transactie
-- teruggerold, zodat er nooit een staat is waarin de meeting geen
-- extractions meer heeft.
--
-- Gekozen boven een generieke UPSERT per row omdat:
-- 1. content-hash niet stabiel genoeg is (LLM output varieert per run);
-- 2. DELETE-voor-INSERT matcht het conceptuele model ("run 2 vervangt run 1");
-- 3. expliciet + makkelijk te redeneren voor de niet-coder-maintainer.
--
-- Alleen callable via service role (SECURITY DEFINER niet nodig —
-- pipeline draait al met service role).

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
  -- Delete alle bestaande extractions voor deze meeting. Geen filter op
  -- type of source — we schrijven alles opnieuw vanuit één run zodat de
  -- set consistent blijft.
  DELETE FROM extractions WHERE meeting_id = p_meeting_id;

  -- Insert de nieuwe rows. jsonb_to_recordset mapt de velden direct naar
  -- de tabel-kolommen; de caller is verantwoordelijk voor schema-correctheid.
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
    follow_up_context
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
    row_data->>'follow_up_context'
  FROM jsonb_array_elements(p_rows) AS row_data;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

COMMENT ON FUNCTION reset_extractions_for_meeting(uuid, jsonb) IS
  'Atomair DELETE+INSERT voor meeting-extractions. Gebruikt door '
  'saveStructuredExtractions om re-runs idempotent te houden: row-count '
  'blijft gelijk bij herhaalde pipeline-runs op dezelfde meeting.';

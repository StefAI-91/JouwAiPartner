-- PW-QC-02 (D5): defensieve post-hoc assertion op extraction types.
--
-- De eerdere migratie `20260418130000_extractions_14_types.sql` heeft
-- `extractions_type_check` geDROPT en een nieuwe CHECK toegevoegd voor
-- de 14 MeetingStructurer-types. Als er toen een legacy rij was met een
-- type buiten die 14, zou de migratie silent gefaald zijn zonder te
-- loggen welke rij.
--
-- Deze migratie doet een defensieve scan en logt een duidelijke NOTICE
-- (of RAISE EXCEPTION) als er toch rijen met onverwachte types zijn
-- overgebleven — sanity check voor de niet-coder-maintainer. In de huidige
-- DB zou dit een no-op moeten zijn; als het niet no-op is weten we dat er
-- ergens legacy data zit die opgeschoond moet worden.

DO $$
DECLARE
  invalid_count integer;
  invalid_types text;
BEGIN
  SELECT COUNT(*), string_agg(DISTINCT type, ', ')
    INTO invalid_count, invalid_types
  FROM extractions
  WHERE type NOT IN (
    'action_item', 'decision', 'risk', 'need', 'commitment',
    'question', 'signal', 'context', 'vision',
    'idea', 'insight', 'client_sentiment', 'pricing_signal', 'milestone'
  );

  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      'Gevonden % extractions met onverwachte type(s): %. De 14-types CHECK '
      'constraint uit 20260418130000 zou deze moeten blokkeren. Onderzoek of '
      'de constraint geldt (\d extractions) en schoon legacy rijen op voordat '
      'USE_MEETING_STRUCTURER=true standaard wordt.',
      invalid_count, invalid_types;
  ELSE
    RAISE NOTICE 'extractions.type defensive-check OK: 0 rijen met onverwacht type';
  END IF;
END
$$;

-- Documenteer de 14 toegestane types op de kolom zodat ze in `\d extractions`
-- zichtbaar zijn — toekomstige migraties kunnen hier defensive op checken.
COMMENT ON COLUMN extractions.type IS
  'Een van de 14 MeetingStructurer-types. Tier-1: action_item, decision, risk, '
  'need, commitment, question, signal, context, vision. Tier-2 (admin-only): '
  'idea, insight, client_sentiment, pricing_signal, milestone. Gevalideerd '
  'door CHECK-constraint extractions_type_check (zie 20260418130000).';

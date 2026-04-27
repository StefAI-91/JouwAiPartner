-- Speaker-mapping (Haiku) — `transcript_elevenlabs_named` is een cache van de
-- ElevenLabs-Scribe-transcript waarin anonieme `[speaker_X]:`-labels zijn
-- vervangen door echte deelnemer-namen via de speaker-identifier-agent.
--
-- Waarom een aparte kolom: `transcript_elevenlabs` blijft de raw bron zodat we
-- altijd opnieuw kunnen mappen wanneer de prompt of de DB-deelnemerslijst
-- verbetert. Deze kolom is dus een rebuildable cache, geen waarheid.
--
-- Lezers (gatekeeper-pipeline summarize, golden-coder, action-item-harness,
-- meeting-transcript-panel) lezen voortaan in deze fallback-volgorde:
--   transcript_elevenlabs_named > transcript_elevenlabs > transcript (Fireflies)
--
-- Nullable: nieuwe meetings krijgen 'm pas na de async speaker-mapping-stap;
-- bestaande meetings krijgen 'm via een eenmalig backfill-script.

ALTER TABLE meetings
  ADD COLUMN transcript_elevenlabs_named TEXT;

COMMENT ON COLUMN meetings.transcript_elevenlabs_named IS
  'ElevenLabs-transcript met [speaker_X]-labels vervangen door deelnemer-namen via speaker-identifier (Haiku). Cache — herbouwbaar uit transcript_elevenlabs.';

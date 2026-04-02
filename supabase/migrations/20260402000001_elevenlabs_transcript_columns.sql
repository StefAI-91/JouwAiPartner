-- Add ElevenLabs Scribe v2 transcript columns to meetings table
-- Keeps Fireflies transcript alongside for comparison

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS transcript_elevenlabs text,
  ADD COLUMN IF NOT EXISTS raw_elevenlabs jsonb,
  ADD COLUMN IF NOT EXISTS audio_url text;

COMMENT ON COLUMN meetings.transcript_elevenlabs IS 'ElevenLabs Scribe v2 transcription (plain text)';
COMMENT ON COLUMN meetings.raw_elevenlabs IS 'Raw ElevenLabs Scribe v2 response (words array, speaker diarization, language confidence)';
COMMENT ON COLUMN meetings.audio_url IS 'Audio recording URL from Fireflies for ElevenLabs processing';

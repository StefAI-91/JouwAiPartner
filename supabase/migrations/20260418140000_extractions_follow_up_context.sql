-- PW-02 action_item-overhaul: voeg follow_up_context kolom toe aan extractions.
--
-- Deze kolom bevat de 100-150 woord Nederlandse opvolg-context die de
-- MeetingStructurer voor action_item-items produceert. Voor andere types is
-- de kolom NULL. Aparte kolom i.p.v. metadata-JSON: (a) de tekst is lang
-- genoeg dat indexen op metadata duur worden; (b) downstream (opvolg-AI,
-- email-drafter) leest dit als primair veld, niet als extra metadata.

ALTER TABLE extractions
  ADD COLUMN IF NOT EXISTS follow_up_context text;

COMMENT ON COLUMN extractions.follow_up_context IS
  'Nederlandse opvolg-context (100-150 woorden) voor action_item-items. NULL voor alle andere types.';

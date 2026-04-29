-- PR-020 — voeg resolution-kolommen toe aan `topics`.
--
-- Twee nieuwe NULL-bare TEXT-kolommen:
--   - resolution         : intern verhaal; wat speelde er, wat is er gedaan
--   - client_resolution  : klant-zichtbare resolutie voor de Portal-roadmap
--
-- Beide zijn optioneel. UI-laag valt terug op niets als de kolom leeg is —
-- geen forced verplichting bij status-overgang naar `done` (kan later via
-- een softe waarschuwing).
--
-- Idempotent: IF NOT EXISTS zodat herhaaldelijk draaien geen errors geeft.
-- Geen RLS-wijziging — bestaande topics-policies dekken de kolommen mee.

ALTER TABLE topics ADD COLUMN IF NOT EXISTS resolution TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS client_resolution TEXT;

COMMENT ON COLUMN topics.resolution IS
  'PR-020 — Interne resolutie/notities; wat het probleem was en wat er gedaan is. Niet zichtbaar voor de klant.';
COMMENT ON COLUMN topics.client_resolution IS
  'PR-020 — Klant-zichtbare resolutie. Verschijnt op de Portal-roadmap zodra topic status `done` is.';

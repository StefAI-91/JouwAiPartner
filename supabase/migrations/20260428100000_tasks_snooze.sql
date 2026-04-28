-- AI-coach inbox sprint — snooze-state op tasks.
--
-- Twee kolommen:
--
--   snoozed_until timestamptz NULL — wanneer de task weer in de actieve
--     inbox verschijnt. NULL betekent "niet gesnoozed". Past < now()
--     in een query om actieve items te filteren; > now() = nog gesnoozed.
--
--   snoozed_reason text NULL — vrije tekst waarom (gevuld door de UI met
--     'niet relevant', 'al gedaan', 'klant levert later', of een eigen
--     notitie). Voedt later de Analyst-agent voor Action Item Specialist
--     prompt-tuning. Zie vision-doc §3.1 amendment 2026-04-28: snooze
--     vervangt de "manual decision"-data die de cockpit↔devhub bridge
--     verzamelt.
--
-- Beide kolommen zijn nullable en hebben geen default. Bestaande rows
-- blijven onaangetast en worden behandeld als "niet gesnoozed".

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS snoozed_until timestamptz,
  ADD COLUMN IF NOT EXISTS snoozed_reason text;

COMMENT ON COLUMN tasks.snoozed_until IS
  'Tijdstip waarop de task weer in de actieve inbox verschijnt. NULL = niet gesnoozed.';

COMMENT ON COLUMN tasks.snoozed_reason IS
  'Vrije tekst waarom de task is gesnoozed. Training-signaal voor Action Item Specialist tuning.';

-- Partial index: queries voor "actieve inbox-items" filteren op
-- snoozed_until IS NULL OR snoozed_until < now(). Een index op rows die
-- nog gesnoozed zijn maakt het uitsluitende deel snel — actieve rows
-- blijven sequential scans op de bestaande status-index.
CREATE INDEX IF NOT EXISTS idx_tasks_snoozed_until
  ON tasks (snoozed_until)
  WHERE snoozed_until IS NOT NULL;

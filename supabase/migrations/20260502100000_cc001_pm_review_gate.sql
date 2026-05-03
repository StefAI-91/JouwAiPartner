-- CC-001: PM-review-gate + Cockpit Inbox foundation
--
-- Vision: docs/specs/vision-customer-communication.md §3, §5, §6, §9.
--
-- Drie samenhangende DB-veranderingen:
--   1a. issues: status-uitbreiding (4 nieuwe statussen) + decline_reason +
--       converted_to_question_id (FK naar client_questions). Alle klant-bron
--       feedback landt vanaf nu op 'needs_pm_review' tot een PM doorzet.
--   1b. client_questions: last_activity_at + trigger zodat een nieuwe reply
--       het hele thread "ververst" voor de inbox-sortering en unread-detectie.
--   1c. inbox_reads: per-user, per-item read-state. Polymorphic (kan naar
--       issue of question wijzen). RLS "own only".
--
-- Geen backfill van bestaande triage-issues — vision §5 is silent over
-- migratie en PM doorloopt huidige backlog manueel. inbox_reads start leeg
-- (alles "nieuw" voor iedereen na deploy = acceptabele one-time cost).

-- =============================================================================
-- 1a. issues: status-uitbreiding + nieuwe kolommen
-- =============================================================================
--
-- Status-flow per bron na deze migratie:
--   needs_pm_review  → portal/widget/userback insert; wacht op PM-endorsement
--   triage           → manual/AI insert óf na endorse; standaard DevHub-stroom
--   backlog/todo/in_progress/done/cancelled  → bestaande DevHub-flow
--   declined         → eind-status na PM-decline (klant ziet "Afgewezen + reason")
--   deferred         → parked door PM, kan terug naar needs_pm_review
--   converted_to_qa  → omgezet naar client_questions; FK in
--                      converted_to_question_id wijst naar de spawned vraag
--
-- DROP IF EXISTS + ADD CONSTRAINT in dezelfde migratie houdt 't atomic.

ALTER TABLE issues DROP CONSTRAINT IF EXISTS chk_issues_status;

ALTER TABLE issues ADD CONSTRAINT chk_issues_status
  CHECK (status IN (
    'needs_pm_review',
    'triage',
    'backlog',
    'todo',
    'in_progress',
    'done',
    'cancelled',
    'declined',
    'deferred',
    'converted_to_qa'
  ));

ALTER TABLE issues ADD COLUMN IF NOT EXISTS decline_reason text;

-- ON DELETE SET NULL aan beide kanten (issue→question via deze FK,
-- question→issue via client_questions.issue_id) houdt 't acyclisch in
-- delete-order; een verwijderde vraag laat de issue achter zonder dangling
-- pointer en vice versa.
ALTER TABLE issues
  ADD COLUMN IF NOT EXISTS converted_to_question_id uuid
  REFERENCES client_questions(id) ON DELETE SET NULL;

-- Partial index — cockpit-inbox query hit deze continu (alle inkomende
-- feedback die op PM wacht). Partial omdat de overgrote meerderheid van
-- issues NIET op needs_pm_review staat.
CREATE INDEX IF NOT EXISTS idx_issues_status_pm_review
  ON issues(status)
  WHERE status = 'needs_pm_review';

-- =============================================================================
-- 1b. client_questions.last_activity_at + activity-trigger
-- =============================================================================
--
-- Inbox sorteert thread-items op laatste activiteit (root-create of nieuwste
-- reply). Zonder deze kolom moet de inbox elke render alle replies joinen +
-- aggregeren — duur en moeilijk te indexeren. last_activity_at lost dat op:
-- alleen root-rijen dragen 'm; replies updaten de root via trigger.

ALTER TABLE client_questions
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

-- Backfill: bestaande root-rijen krijgen hun created_at als activity-bookmark.
-- Replies blijven NULL (die staan zelf nooit in de inbox-lijst).
UPDATE client_questions
  SET last_activity_at = created_at
  WHERE parent_id IS NULL AND last_activity_at IS NULL;

CREATE OR REPLACE FUNCTION sync_client_question_activity() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    -- Root insert: zelf-stempel.
    NEW.last_activity_at := NEW.created_at;
  ELSE
    -- Reply insert: tilt parent's activity-bookmark op.
    UPDATE client_questions
      SET last_activity_at = NEW.created_at
      WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_client_question_activity ON client_questions;

CREATE TRIGGER trg_client_question_activity
  BEFORE INSERT ON client_questions
  FOR EACH ROW EXECUTE FUNCTION sync_client_question_activity();

-- =============================================================================
-- 1c. inbox_reads — per-user read-state (polymorphic)
-- =============================================================================
--
-- Bewuste keuzes:
--   - Geen FK op item_id: polymorphic (issue of question). Een dangling
--     read-row na delete is geen data-corruptie, alleen wat dood-data.
--   - Per-user (niet per-org): cross-project team-leden hebben elk hun eigen
--     "wat heb ik gezien"-state.
--   - item_kind als string ipv enum: uitbreidbaar (bv. outbound_draft later)
--     zonder migratie.

CREATE TABLE IF NOT EXISTS inbox_reads (
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_kind text NOT NULL CHECK (item_kind IN ('issue', 'question')),
  item_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, item_kind, item_id)
);

CREATE INDEX IF NOT EXISTS idx_inbox_reads_profile_kind
  ON inbox_reads (profile_id, item_kind);

ALTER TABLE inbox_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inbox_reads: own only" ON inbox_reads;

CREATE POLICY "inbox_reads: own only" ON inbox_reads
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

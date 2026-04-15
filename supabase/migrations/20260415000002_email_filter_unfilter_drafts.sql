-- Corrective migration: historische draft-emails terugzetten naar 'kept'
--
-- De backfill in 20260415000001_email_filter_status.sql markeerde alle
-- processed emails met lage relevance of newsletter/notification-type als
-- 'filtered'. Daar zaten óók draft-emails bij die nog in de review-queue
-- thuishoorden — die verdwenen daardoor uit /review.
--
-- Fix: elke email met filter_status='filtered' en verification_status='draft'
-- terugzetten naar 'kept' zodat ze weer in review verschijnen. Na een
-- expliciete 'verified' of 'rejected' beoordeeling kan een admin via
-- "Alsnog doorlaten" / UI deze alsnog in Gefilterd plaatsen als nodig.
--
-- Idempotent: meerdere keren draaien is veilig (target subset krimpt naar 0).

UPDATE emails
SET
    filter_status = 'kept',
    filter_reason = NULL
WHERE
    filter_status = 'filtered'
    AND verification_status = 'draft';

COMMENT ON COLUMN emails.filter_status IS
    'Gatekeeper status: kept (visible in main inbox) or filtered (audit-only in Gefilterd tab). Draft emails blijven altijd kept — de review-queue moet ze kunnen tonen.';

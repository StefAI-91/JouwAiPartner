-- Email Filter Gatekeeper — pre-save filter status + reason
-- Allows emails to be auto-filtered into a separate "Gefilterd" tab (audit trail)
-- while keeping an unfilter-knop on the detail page to re-admit them to the main flow.
--
-- Filter rules (applied in the AI pipeline):
--   email_type IN ('newsletter', 'notification', 'cold_outreach')
--   OR (relevance_score < 0.4 AND party_type NOT IN ('client','accountant','tax_advisor','lawyer'))
--
-- Safety net (never filtered, even with low score):
--   party_type IN ('client','accountant','tax_advisor','lawyer')
--   OR email_type = 'legal_finance'

ALTER TABLE emails
    ADD COLUMN filter_status TEXT NOT NULL DEFAULT 'kept',
    ADD COLUMN filter_reason TEXT,
    ADD CONSTRAINT emails_filter_status_check CHECK (
        filter_status IN ('kept', 'filtered')
    );

-- Index for the two most common queries: Inbox list + Gefilterd tab
CREATE INDEX idx_emails_filter_status ON emails(filter_status);

-- Backfill existing emails: apply the same rules retroactively so the
-- user immediately sees a clean inbox on first deploy.
-- Note: cold_outreach isn't backfilled here (classifier didn't know the
-- category yet) — those emails stay as-is and get re-classified on
-- explicit action only.
UPDATE emails
SET
    filter_status = 'filtered',
    filter_reason = CASE
        WHEN email_type = 'newsletter' THEN 'newsletter'
        WHEN email_type = 'notification' THEN 'notification'
        WHEN relevance_score IS NOT NULL
             AND relevance_score < 0.4
             AND (party_type IS NULL OR party_type NOT IN ('client', 'accountant', 'tax_advisor', 'lawyer'))
             AND (email_type IS NULL OR email_type <> 'legal_finance')
        THEN 'low_relevance'
        ELSE NULL
    END
WHERE
    -- Only touch processed emails (unprocessed ones will be evaluated by the pipeline)
    is_processed = TRUE
    AND (
        email_type IN ('newsletter', 'notification')
        OR (
            relevance_score IS NOT NULL
            AND relevance_score < 0.4
            AND (party_type IS NULL OR party_type NOT IN ('client', 'accountant', 'tax_advisor', 'lawyer'))
            AND (email_type IS NULL OR email_type <> 'legal_finance')
        )
    );

COMMENT ON COLUMN emails.filter_status IS
    'Gatekeeper status: kept (visible in main inbox) or filtered (audit-only in Gefilterd tab)';
COMMENT ON COLUMN emails.filter_reason IS
    'Reason for filtering: newsletter, notification, cold_outreach, low_relevance (null when kept)';

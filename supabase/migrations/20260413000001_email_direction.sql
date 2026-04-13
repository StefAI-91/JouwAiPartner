-- Email Direction — distinguish incoming vs outgoing (sent) emails
-- Adds a `direction` column, derived from Gmail's SENT label at insert time.
-- Backfills existing rows: any email carrying the SENT label becomes 'outgoing',
-- everything else defaults to 'incoming'.

ALTER TABLE emails ADD COLUMN direction TEXT NOT NULL DEFAULT 'incoming';

ALTER TABLE emails ADD CONSTRAINT emails_direction_check CHECK (
    direction IN ('incoming', 'outgoing')
);

-- Backfill: any existing email with the SENT label is outgoing
UPDATE emails SET direction = 'outgoing' WHERE 'SENT' = ANY(labels);

CREATE INDEX idx_emails_direction ON emails(direction);

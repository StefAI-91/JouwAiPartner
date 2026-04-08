-- Email Labeling — Add email_type and party_type columns
-- email_type: persisted classification (was only in classifier output before)
-- party_type: identifies the external party role (e.g. accountant, tax_advisor)

-- Add email_type column with allowed values
ALTER TABLE emails ADD COLUMN email_type TEXT;

ALTER TABLE emails ADD CONSTRAINT emails_email_type_check CHECK (
    email_type IS NULL OR email_type IN (
        'project_communication',
        'sales',
        'internal',
        'administrative',
        'legal_finance',
        'newsletter',
        'notification',
        'other'
    )
);

CREATE INDEX idx_emails_email_type ON emails(email_type);

-- Add party_type column — identifies sender/recipient role
ALTER TABLE emails ADD COLUMN party_type TEXT;

ALTER TABLE emails ADD CONSTRAINT emails_party_type_check CHECK (
    party_type IS NULL OR party_type IN (
        'internal',
        'client',
        'accountant',
        'tax_advisor',
        'lawyer',
        'partner',
        'other'
    )
);

CREATE INDEX idx_emails_party_type ON emails(party_type);

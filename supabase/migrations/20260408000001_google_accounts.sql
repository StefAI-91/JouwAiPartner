-- Email Integration — Migratie 1: Google Accounts (OAuth token storage)
-- Stores Google Workspace OAuth credentials for Stef & Wouter

CREATE TABLE google_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMPTZ NOT NULL,
    scopes TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT google_accounts_email_unique UNIQUE (email)
);

CREATE INDEX idx_google_accounts_user_id ON google_accounts(user_id);
CREATE INDEX idx_google_accounts_is_active ON google_accounts(is_active) WHERE is_active = TRUE;

-- RLS
ALTER TABLE google_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all google_accounts"
  ON google_accounts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage google_accounts"
  ON google_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fix: Restrict google_accounts SELECT to own accounts only
-- Previously all authenticated users could read all accounts (including tokens)

DROP POLICY IF EXISTS "Authenticated users can read all google_accounts" ON google_accounts;
DROP POLICY IF EXISTS "Authenticated users can manage google_accounts" ON google_accounts;

-- Users can only read their own Google accounts
CREATE POLICY "Users can read own google_accounts"
  ON google_accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can only manage their own Google accounts
CREATE POLICY "Users can manage own google_accounts"
  ON google_accounts FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

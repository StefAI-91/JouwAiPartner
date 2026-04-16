-- Move Slack config from projects table to a dedicated table with admin-only RLS.
-- The projects table has permissive RLS (all authenticated users can read all columns),
-- which means the webhook URL (a secret token) would be readable by non-admins.
-- A separate table with strict RLS prevents this.

-- 1. Create dedicated slack config table
CREATE TABLE project_slack_config (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  notify_events TEXT[] DEFAULT '{critical_issue,high_bug,priority_urgent}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT project_slack_config_webhook_https
    CHECK (webhook_url LIKE 'https://hooks.slack.com/%')
);

-- 2. Admin-only RLS
ALTER TABLE project_slack_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read slack config"
  ON project_slack_config FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Only admins can manage slack config"
  ON project_slack_config FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Migrate any existing data from projects table
INSERT INTO project_slack_config (project_id, webhook_url, notify_events)
SELECT id, slack_webhook_url, slack_notify_events
FROM projects
WHERE slack_webhook_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Drop slack columns from projects table
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_slack_webhook_url_https;
ALTER TABLE projects DROP COLUMN IF EXISTS slack_webhook_url;
ALTER TABLE projects DROP COLUMN IF EXISTS slack_notify_events;

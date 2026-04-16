-- Add Slack notification configuration to projects table.
-- Enables per-project Slack Incoming Webhook integration for urgent bug alerts.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS slack_notify_events TEXT[] DEFAULT '{critical_issue,high_bug,priority_urgent}';

-- Add a check constraint to validate webhook URL format (basic https check)
ALTER TABLE projects
  ADD CONSTRAINT projects_slack_webhook_url_https
  CHECK (slack_webhook_url IS NULL OR slack_webhook_url LIKE 'https://hooks.slack.com/%');

COMMENT ON COLUMN projects.slack_webhook_url IS 'Slack Incoming Webhook URL for this project. NULL = notifications disabled.';
COMMENT ON COLUMN projects.slack_notify_events IS 'Which events trigger a Slack notification. Valid: critical_issue, high_bug, priority_urgent.';

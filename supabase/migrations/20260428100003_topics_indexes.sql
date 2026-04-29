-- PR-001: Topics database foundation — indexes
-- PR-DATA-008
--
-- Indexes ondersteunen de queries die in PR-002 t/m PR-008 landen:
-- - (project_id, status): bucket-rollup voor portal en devhub-board
-- - (target_sprint_id) partial: "in current sprint"-filter voor "Komende week"
-- - (closed_at) partial: 14-dagen-recent-done window
-- - (type, status): bug-vs-feature-pivot in DevHub
-- - junction: lookups van issue → topic en topic → issues

CREATE INDEX IF NOT EXISTS idx_topics_project_status
  ON topics(project_id, status);

CREATE INDEX IF NOT EXISTS idx_topics_target_sprint
  ON topics(target_sprint_id)
  WHERE target_sprint_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_topics_closed_at
  ON topics(closed_at)
  WHERE closed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_topics_type_status
  ON topics(type, status);

CREATE INDEX IF NOT EXISTS idx_topic_issues_topic
  ON topic_issues(topic_id);

CREATE INDEX IF NOT EXISTS idx_topic_issues_issue
  ON topic_issues(issue_id);

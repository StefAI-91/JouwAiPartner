-- PR-001: Topics database foundation — topic_issues junction
-- PR-DATA-002, PR-DATA-007, PR-RULE-001
--
-- Junction tussen topics en issues. UNIQUE op issue_id borgt de hard-regel
-- "een issue kan aan max één topic gekoppeld zijn" zonder een directe FK
-- op issues.topic_id (zou een latere split-flow ingewikkeld maken).

CREATE TABLE IF NOT EXISTS topic_issues (
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  issue_id uuid NOT NULL UNIQUE REFERENCES issues(id) ON DELETE CASCADE,
  linked_at timestamptz NOT NULL DEFAULT now(),
  linked_by uuid NOT NULL REFERENCES profiles(id),
  linked_via text NOT NULL DEFAULT 'manual'
    CHECK (linked_via IN ('manual', 'agent', 'migration')),
  PRIMARY KEY (topic_id, issue_id)
);

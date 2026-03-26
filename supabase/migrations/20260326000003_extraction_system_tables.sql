-- Sprint 02 Task 3: Structured extraction + system tables
-- Tables: decisions, action_items, content_reviews, insights

CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision TEXT NOT NULL,
    context TEXT,
    source_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    made_by TEXT,
    date TIMESTAMP,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    assignee TEXT,
    due_date DATE,
    status TEXT DEFAULT 'open',
    source_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE content_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL,
    content_table TEXT NOT NULL,
    agent_role TEXT NOT NULL,
    action TEXT NOT NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    supporting_sources JSONB DEFAULT '[]',
    topic TEXT,
    dispatched BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_action_items_assignee ON action_items(assignee);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_decisions_source ON decisions(source_type, source_id);
CREATE INDEX idx_content_reviews_content ON content_reviews(content_id, content_table);
CREATE INDEX idx_content_reviews_agent ON content_reviews(agent_role);

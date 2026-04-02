-- Tasks: promoted action items that are actively tracked and followed up.
-- Separates "what was said" (extractions) from "what we act on" (tasks).

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extraction_id UUID REFERENCES extractions(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    assigned_to UUID REFERENCES people(id) ON DELETE SET NULL,
    due_date DATE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT tasks_status_check CHECK (
        status IN ('active', 'done', 'dismissed')
    )
);

-- Indexes
CREATE INDEX idx_tasks_status ON tasks (status);
CREATE INDEX idx_tasks_assigned_to ON tasks (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_tasks_due_date ON tasks (due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_extraction_id ON tasks (extraction_id) WHERE extraction_id IS NOT NULL;

-- Remove assignment columns from extractions (now live on tasks)
ALTER TABLE extractions DROP COLUMN IF EXISTS assigned_to;
ALTER TABLE extractions DROP COLUMN IF EXISTS due_date;

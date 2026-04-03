-- Action item assignments: assigned_to (FK → people) and due_date on extractions
-- Allows assigning action items to team members or clients, and setting deadlines.

ALTER TABLE extractions
    ADD COLUMN assigned_to UUID REFERENCES people(id) ON DELETE SET NULL,
    ADD COLUMN due_date DATE;

-- Index for querying action items by assignee
CREATE INDEX idx_extractions_assigned_to ON extractions (assigned_to) WHERE assigned_to IS NOT NULL;

-- Index for querying action items by due date
CREATE INDEX idx_extractions_due_date ON extractions (due_date) WHERE due_date IS NOT NULL;

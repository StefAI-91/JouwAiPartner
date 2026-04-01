-- Update meeting_type values: migrate old types to new classification system
-- Old: standup, sprint_review, strategy, client_call, internal, one_on_one, other
-- New: strategy, one_on_one, team_sync, discovery, sales, project_kickoff, status_update, collaboration, other

UPDATE meetings SET meeting_type = 'team_sync' WHERE meeting_type = 'standup';
UPDATE meetings SET meeting_type = 'team_sync' WHERE meeting_type = 'sprint_review';
UPDATE meetings SET meeting_type = 'team_sync' WHERE meeting_type = 'internal';
UPDATE meetings SET meeting_type = 'status_update' WHERE meeting_type = 'client_call';

-- Add CHECK constraint for new meeting types
ALTER TABLE meetings ADD CONSTRAINT meetings_meeting_type_check CHECK (
    meeting_type IS NULL OR meeting_type IN (
        'strategy', 'one_on_one', 'team_sync',
        'discovery', 'sales', 'project_kickoff', 'status_update', 'collaboration',
        'other'
    )
);

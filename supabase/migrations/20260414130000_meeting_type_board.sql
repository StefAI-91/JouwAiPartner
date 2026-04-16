-- Add 'board' meeting_type for bestuurlijke overleggen tussen admin-deelnemers (sprint 035)
-- Drop + recreate the CHECK constraint with 'board' included.

ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_meeting_type_check;

ALTER TABLE meetings ADD CONSTRAINT meetings_meeting_type_check CHECK (
    meeting_type IS NULL OR meeting_type IN (
        -- Fireflies pipeline
        'strategy', 'one_on_one', 'team_sync',
        'discovery', 'sales', 'project_kickoff', 'status_update', 'collaboration',
        'other',
        -- Bestuurlijk overleg (sprint 035)
        'board',
        -- Manual input channels (MCP log_client_update)
        'phone_call', 'email_update', 'chat_message'
    )
);

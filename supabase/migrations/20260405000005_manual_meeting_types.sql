-- Add manual input channel types to meeting_type CHECK constraint
-- These support logging client updates via MCP without Fireflies integration

ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_meeting_type_check;

ALTER TABLE meetings ADD CONSTRAINT meetings_meeting_type_check CHECK (
    meeting_type IS NULL OR meeting_type IN (
        -- Existing types (Fireflies pipeline)
        'strategy', 'one_on_one', 'team_sync',
        'discovery', 'sales', 'project_kickoff', 'status_update', 'collaboration',
        'other',
        -- Manual input channels (MCP log_client_update)
        'phone_call', 'email_update', 'chat_message'
    )
);

-- Usage tracking for MCP tool calls
CREATE TABLE mcp_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    query TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mcp_queries_tool ON mcp_queries (tool);
CREATE INDEX idx_mcp_queries_created_at ON mcp_queries (created_at);

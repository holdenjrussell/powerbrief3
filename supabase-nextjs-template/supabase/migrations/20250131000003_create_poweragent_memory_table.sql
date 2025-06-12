-- Create PowerAgent memory table for storing conversation history
CREATE TABLE IF NOT EXISTS poweragent_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES poweragent_agents(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    -- Note: If you want to use embeddings for semantic search, uncomment the following lines
    -- after enabling the pgvector extension:
    -- embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_poweragent_memory_agent_id ON poweragent_memory(agent_id);
CREATE INDEX idx_poweragent_memory_brand_id ON poweragent_memory(brand_id);
CREATE INDEX idx_poweragent_memory_session_id ON poweragent_memory(session_id);
CREATE INDEX idx_poweragent_memory_created_at ON poweragent_memory(created_at DESC);

-- Note: If you enabled the embedding column above, uncomment this index:
-- CREATE INDEX idx_poweragent_memory_embedding ON poweragent_memory 
--     USING ivfflat (embedding vector_cosine_ops)
--     WITH (lists = 100);

-- Enable RLS
ALTER TABLE poweragent_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view memory for agents in brands they have access to
CREATE POLICY "Users can view memory for their brands" ON poweragent_memory
    FOR SELECT USING (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares
            WHERE shared_with_user_id = auth.uid()
        )
    );

-- Users can create memory entries for agents in brands they have access to
CREATE POLICY "Users can create memory for their brands" ON poweragent_memory
    FOR INSERT WITH CHECK (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares
            WHERE shared_with_user_id = auth.uid()
        )
    );

-- Users can update memory entries for agents in brands they have access to
CREATE POLICY "Users can update memory for their brands" ON poweragent_memory
    FOR UPDATE USING (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares
            WHERE shared_with_user_id = auth.uid()
        )
    );

-- Users can delete memory entries for agents in brands they have access to
CREATE POLICY "Users can delete memory for their brands" ON poweragent_memory
    FOR DELETE USING (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares
            WHERE shared_with_user_id = auth.uid()
        )
    );

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_poweragent_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_poweragent_memory_updated_at
    BEFORE UPDATE ON poweragent_memory
    FOR EACH ROW
    EXECUTE FUNCTION update_poweragent_memory_updated_at();

-- Create a view for easier memory retrieval with agent info
CREATE VIEW poweragent_memory_with_agent AS
SELECT 
    m.*,
    a.name as agent_name,
    a.purpose as agent_purpose
FROM poweragent_memory m
JOIN poweragent_agents a ON m.agent_id = a.id;

-- Grant access to the view
GRANT SELECT ON poweragent_memory_with_agent TO authenticated;

-- Add comment
COMMENT ON TABLE poweragent_memory IS 'Stores conversation memory for PowerAgent agents, segregated by brand'; 
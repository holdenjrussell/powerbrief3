-- Enable RLS on all PowerAgent tables
ALTER TABLE poweragent_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE poweragent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE poweragent_toolkits ENABLE ROW LEVEL SECURITY;
ALTER TABLE poweragent_agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE poweragent_toolkit_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE poweragent_agent_toolkits ENABLE ROW LEVEL SECURITY;
ALTER TABLE poweragent_metrics ENABLE ROW LEVEL SECURITY;

-- PowerAgent Agents policies
-- Users can view agents for brands they have access to
CREATE POLICY "Users can view agents for their brands" ON poweragent_agents
    FOR SELECT USING (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares
            WHERE shared_with_user_id = auth.uid()
        )
    );

-- Users can create agents for brands they have access to
CREATE POLICY "Users can create agents for their brands" ON poweragent_agents
    FOR INSERT WITH CHECK (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares
            WHERE shared_with_user_id = auth.uid()
        )
    );

-- Users can update agents for brands they have access to
CREATE POLICY "Users can update agents for their brands" ON poweragent_agents
    FOR UPDATE USING (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares
            WHERE shared_with_user_id = auth.uid()
        )
    );

-- Users can delete agents for brands they have access to
CREATE POLICY "Users can delete agents for their brands" ON poweragent_agents
    FOR DELETE USING (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares
            WHERE shared_with_user_id = auth.uid()
        )
    );

-- PowerAgent Tools policies
-- Users can view tools for brands they have access to
CREATE POLICY "Users can view tools for their brands" ON poweragent_tools
    FOR SELECT USING (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares
            WHERE shared_with_user_id = auth.uid()
        )
    );

-- Users can create tools for brands they have access to
CREATE POLICY "Users can create tools for their brands" ON poweragent_tools
    FOR INSERT WITH CHECK (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares
            WHERE shared_with_user_id = auth.uid()
        )
    );

-- Users can update tools for brands they have access to
CREATE POLICY "Users can update tools for their brands" ON poweragent_tools
    FOR UPDATE USING (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares
            WHERE shared_with_user_id = auth.uid()
        )
    );

-- Users can delete tools for brands they have access to
CREATE POLICY "Users can delete tools for their brands" ON poweragent_tools
    FOR DELETE USING (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares
            WHERE shared_with_user_id = auth.uid()
        )
    );

-- PowerAgent Toolkits policies
-- Users can view toolkits for brands they have access to
CREATE POLICY "Users can view toolkits for their brands" ON poweragent_toolkits
    FOR SELECT USING (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares
            WHERE shared_with_user_id = auth.uid()
        )
    );

-- Users can create toolkits for brands they have access to
CREATE POLICY "Users can create toolkits for their brands" ON poweragent_toolkits
    FOR INSERT WITH CHECK (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares
            WHERE shared_with_user_id = auth.uid()
        )
    );

-- Users can update toolkits for brands they have access to
CREATE POLICY "Users can update toolkits for their brands" ON poweragent_toolkits
    FOR UPDATE USING (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares
            WHERE shared_with_user_id = auth.uid()
        )
    );

-- Users can delete toolkits for brands they have access to
CREATE POLICY "Users can delete toolkits for their brands" ON poweragent_toolkits
    FOR DELETE USING (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares
            WHERE shared_with_user_id = auth.uid()
        )
    );

-- Agent Tools relationship policies
-- Users can view agent-tool relationships for agents they have access to
CREATE POLICY "Users can view agent tools" ON poweragent_agent_tools
    FOR SELECT USING (
        agent_id IN (
            SELECT id FROM poweragent_agents 
            WHERE brand_id IN (
                SELECT id FROM brands 
                WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM brand_shares
                WHERE shared_with_user_id = auth.uid()
            )
        )
    );

-- Users can manage agent-tool relationships for agents they have access to
CREATE POLICY "Users can manage agent tools" ON poweragent_agent_tools
    FOR ALL USING (
        agent_id IN (
            SELECT id FROM poweragent_agents 
            WHERE brand_id IN (
                SELECT id FROM brands 
                WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM brand_shares
                WHERE shared_with_user_id = auth.uid()
            )
        )
    );

-- Toolkit Tools relationship policies
-- Users can view toolkit-tool relationships for toolkits they have access to
CREATE POLICY "Users can view toolkit tools" ON poweragent_toolkit_tools
    FOR SELECT USING (
        toolkit_id IN (
            SELECT id FROM poweragent_toolkits 
            WHERE brand_id IN (
                SELECT id FROM brands 
                WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM brand_shares
                WHERE shared_with_user_id = auth.uid()
            )
        )
    );

-- Users can manage toolkit-tool relationships for toolkits they have access to
CREATE POLICY "Users can manage toolkit tools" ON poweragent_toolkit_tools
    FOR ALL USING (
        toolkit_id IN (
            SELECT id FROM poweragent_toolkits 
            WHERE brand_id IN (
                SELECT id FROM brands 
                WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM brand_shares
                WHERE shared_with_user_id = auth.uid()
            )
        )
    );

-- Agent Toolkits relationship policies
-- Users can view agent-toolkit relationships for agents they have access to
CREATE POLICY "Users can view agent toolkits" ON poweragent_agent_toolkits
    FOR SELECT USING (
        agent_id IN (
            SELECT id FROM poweragent_agents 
            WHERE brand_id IN (
                SELECT id FROM brands 
                WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM brand_shares
                WHERE shared_with_user_id = auth.uid()
            )
        )
    );

-- Users can manage agent-toolkit relationships for agents they have access to
CREATE POLICY "Users can manage agent toolkits" ON poweragent_agent_toolkits
    FOR ALL USING (
        agent_id IN (
            SELECT id FROM poweragent_agents 
            WHERE brand_id IN (
                SELECT id FROM brands 
                WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM brand_shares
                WHERE shared_with_user_id = auth.uid()
            )
        )
    );

-- PowerAgent Metrics policies
-- Users can view metrics for agents they have access to
CREATE POLICY "Users can view metrics for their agents" ON poweragent_metrics
    FOR SELECT USING (
        agent_id IN (
            SELECT id FROM poweragent_agents 
            WHERE brand_id IN (
                SELECT id FROM brands 
                WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM brand_shares
                WHERE shared_with_user_id = auth.uid()
            )
        )
    );

-- Users can create metrics (for tracking usage)
CREATE POLICY "Users can create metrics" ON poweragent_metrics
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        agent_id IN (
            SELECT id FROM poweragent_agents 
            WHERE brand_id IN (
                SELECT id FROM brands 
                WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM brand_shares
                WHERE shared_with_user_id = auth.uid()
            )
        )
    ); 
-- Create PowerAgent agents table
CREATE TABLE IF NOT EXISTS poweragent_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  purpose TEXT,
  instructions TEXT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_agent_name_per_brand UNIQUE (brand_id, name)
);

-- Create custom tools table
CREATE TABLE IF NOT EXISTS poweragent_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parameters JSONB DEFAULT '{}',
  execute_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_tool_name_per_brand UNIQUE (brand_id, name)
);

-- Create toolkits table
CREATE TABLE IF NOT EXISTS poweragent_toolkits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  add_instructions BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_toolkit_name_per_brand UNIQUE (brand_id, name)
);

-- Create agent tools relationship table
CREATE TABLE IF NOT EXISTS poweragent_agent_tools (
  agent_id UUID REFERENCES poweragent_agents(id) ON DELETE CASCADE,
  tool_id UUID REFERENCES poweragent_tools(id) ON DELETE CASCADE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (agent_id, tool_id)
);

-- Create toolkit tools relationship table
CREATE TABLE IF NOT EXISTS poweragent_toolkit_tools (
  toolkit_id UUID REFERENCES poweragent_toolkits(id) ON DELETE CASCADE,
  tool_id UUID REFERENCES poweragent_tools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (toolkit_id, tool_id)
);

-- Create agent toolkits relationship table
CREATE TABLE IF NOT EXISTS poweragent_agent_toolkits (
  agent_id UUID REFERENCES poweragent_agents(id) ON DELETE CASCADE,
  toolkit_id UUID REFERENCES poweragent_toolkits(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (agent_id, toolkit_id)
);

-- Create agent metrics table
CREATE TABLE IF NOT EXISTS poweragent_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES poweragent_agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  conversation_id TEXT,
  tokens_used INTEGER,
  execution_time_ms INTEGER,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_poweragent_agents_brand_id ON poweragent_agents(brand_id);
CREATE INDEX IF NOT EXISTS idx_poweragent_agents_created_at ON poweragent_agents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poweragent_tools_brand_id ON poweragent_tools(brand_id);
CREATE INDEX IF NOT EXISTS idx_poweragent_toolkits_brand_id ON poweragent_toolkits(brand_id);
CREATE INDEX IF NOT EXISTS idx_poweragent_metrics_agent_id ON poweragent_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_poweragent_metrics_user_id ON poweragent_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_poweragent_metrics_created_at ON poweragent_metrics(created_at DESC);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_poweragent_agents_updated_at BEFORE UPDATE ON poweragent_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_poweragent_tools_updated_at BEFORE UPDATE ON poweragent_tools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_poweragent_toolkits_updated_at BEFORE UPDATE ON poweragent_toolkits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 
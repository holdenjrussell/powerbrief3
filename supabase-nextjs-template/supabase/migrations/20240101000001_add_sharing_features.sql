-- Add share_settings column to brief_batches table
ALTER TABLE brief_batches 
ADD COLUMN IF NOT EXISTS share_settings JSONB DEFAULT NULL;

-- Add share_settings column to brief_concepts table  
ALTER TABLE brief_concepts
ADD COLUMN IF NOT EXISTS share_settings JSONB DEFAULT NULL;

-- Create share_activities table to track sharing events
CREATE TABLE IF NOT EXISTS share_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_id TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('batch', 'concept')),
  resource_id UUID NOT NULL,
  recipient_email TEXT,
  share_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add indexes for performance
  CONSTRAINT share_activities_share_id_unique UNIQUE (share_id)
);

-- Add RLS policies to share_activities
ALTER TABLE share_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own share activities" 
  ON share_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own share activities" 
  ON share_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add indexes to improve performance of share lookups
CREATE INDEX IF NOT EXISTS brief_batches_share_settings_idx ON brief_batches USING gin(share_settings);
CREATE INDEX IF NOT EXISTS brief_concepts_share_settings_idx ON brief_concepts USING gin(share_settings); 
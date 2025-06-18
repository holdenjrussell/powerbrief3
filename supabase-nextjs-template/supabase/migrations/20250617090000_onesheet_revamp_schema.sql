-- OneSheet Revamp Schema Updates

-- Create context_data table for storing loaded context
CREATE TABLE IF NOT EXISTS onesheet_context_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  onesheet_id UUID REFERENCES onesheet(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'brand_website', 
    'brand_social', 
    'competitor_website', 
    'competitor_social',
    'competitor_ads',
    'reddit', 
    'quora',
    'tiktok',
    'youtube',
    'reviews', 
    'articles',
    'other'
  )),
  source_name TEXT, -- e.g., "Main competitor", "Our brand Instagram"
  source_url TEXT,
  content_text TEXT,
  extracted_data JSONB DEFAULT '{}', -- For storing structured data from AdRipper/Gemini
  metadata JSONB DEFAULT '{}', -- Additional metadata like video analysis results
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add manual_entries to store user-entered data alongside AI
ALTER TABLE onesheet 
ADD COLUMN IF NOT EXISTS manual_entries JSONB DEFAULT '{
  "angles": [],
  "benefits": [],
  "painPoints": [],
  "features": [],
  "objections": [],
  "failedSolutions": [],
  "personas": [],
  "competitors": [],
  "hooks": [],
  "visuals": []
}';

-- Add creative_outputs for the new 4-part structure
ALTER TABLE onesheet 
ADD COLUMN IF NOT EXISTS creative_outputs JSONB DEFAULT '{
  "imageConcepts": [],
  "videoConcepts": [],
  "hooksByAngle": {},
  "visualsByAngle": {}
}';

-- Add context_loaded flags to track progress
ALTER TABLE onesheet 
ADD COLUMN IF NOT EXISTS context_loaded JSONB DEFAULT '{
  "brandWebsite": false,
  "brandSocial": false,
  "competitorWebsite": false,
  "competitorSocial": false,
  "competitorAds": false,
  "reviews": false,
  "reddit": false,
  "articles": false,
  "organicContent": false
}';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_onesheet_context_data_onesheet_id ON onesheet_context_data(onesheet_id);
CREATE INDEX IF NOT EXISTS idx_onesheet_context_data_source_type ON onesheet_context_data(source_type);
CREATE INDEX IF NOT EXISTS idx_onesheet_context_data_active ON onesheet_context_data(is_active);

-- Add RLS policies
ALTER TABLE onesheet_context_data ENABLE ROW LEVEL SECURITY;

-- Policy for users to manage their own context data
CREATE POLICY "Users can manage their own OneSheet context data" ON onesheet_context_data
  FOR ALL USING (
    onesheet_id IN (
      SELECT id FROM onesheet WHERE user_id = auth.uid()
    )
  );

-- Add updated_at trigger for context_data
CREATE OR REPLACE FUNCTION update_onesheet_context_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER onesheet_context_data_updated_at_trigger
  BEFORE UPDATE ON onesheet_context_data
  FOR EACH ROW
  EXECUTE FUNCTION update_onesheet_context_data_updated_at();

-- Update the onesheet table to include new fields for tracking
ALTER TABLE onesheet
ADD COLUMN IF NOT EXISTS last_context_update TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS workflow_stage TEXT DEFAULT 'context_loading' CHECK (workflow_stage IN (
  'context_loading',
  'audience_research', 
  'competitor_analysis',
  'social_listening',
  'performance_audit',
  'synthesis',
  'creative_generation',
  'completed'
));

-- Add comment for documentation
COMMENT ON TABLE onesheet_context_data IS 'Stores all loaded context data for OneSheet research workflow';
COMMENT ON COLUMN onesheet_context_data.source_type IS 'Type of content source being stored';
COMMENT ON COLUMN onesheet_context_data.extracted_data IS 'Structured data extracted by AdRipper or Gemini analysis';
COMMENT ON COLUMN onesheet.manual_entries IS 'User-entered data that complements AI-generated content';
COMMENT ON COLUMN onesheet.creative_outputs IS 'Final creative outputs organized by type and angle'; 
-- Enhance OneSheet table structure for comprehensive creative strategy

-- Add new columns to support enhanced data structures
ALTER TABLE onesheet
ADD COLUMN IF NOT EXISTS social_listening_data JSONB DEFAULT '{"reddit": [], "quora": [], "adComments": []}'::jsonb,
ADD COLUMN IF NOT EXISTS organic_research_data JSONB DEFAULT '{"tiktok": [], "youtubeShorts": []}'::jsonb,
ADD COLUMN IF NOT EXISTS ad_performance_data JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_prompt_templates JSONB DEFAULT '{
  "adAngles": "Analyze the whole website and customer reviews and give me different ad angles to sell this product in a facebook ad in the order that you think would be most relevant to customers: {{urls}}",
  "benefitsPainPoints": "Give me some benefits/pain points of people who use {{product}} in priority order: {{url}}",
  "audienceResearch": "Using the reviews below, give me details on each of the following for my product...",
  "statisticsResearch": "Give me some shocking statistics about pain point X or benefit Y",
  "redditAnalysis": "Analyze this Reddit post and identify keywords and phrases people use when talking about {{product}}",
  "forumAnalysis": "Generic forum analysis prompt",
  "competitorGapAnalysis": "Analyze similarities and differences between competitors",
  "competitorReviewAnalysis": "Analyze competitor reviews for dissatisfaction",
  "conceptGeneration": "Generate ad concepts based on research",
  "hookGeneration": "Generate hooks from customer language",
  "visualGeneration": "Generate visual ideas for ads"
}'::jsonb,
ADD COLUMN IF NOT EXISTS brainstorm_notes TEXT,
ADD COLUMN IF NOT EXISTS custom_sections JSONB DEFAULT '[]'::jsonb;

-- Update the audience_insights column to be an array instead of object
-- First, backup existing data if any
DO $$
BEGIN
  -- Check if the column exists and has data
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'onesheet' 
    AND column_name = 'audience_insights'
  ) THEN
    -- Create a temporary column to store the data
    ALTER TABLE onesheet ADD COLUMN IF NOT EXISTS audience_insights_temp JSONB;
    
    -- Convert object to array format if needed
    UPDATE onesheet 
    SET audience_insights_temp = 
      CASE 
        WHEN jsonb_typeof(audience_insights) = 'object' THEN
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', gen_random_uuid()::text,
              'category', key,
              'title', value->>'title',
              'supportingEvidence', COALESCE(value->'supportingEvidence', jsonb_build_object(
                'reviews', '[]'::jsonb,
                'information', '[]'::jsonb,
                'statistics', '[]'::jsonb
              ))
            )
          )
          FROM jsonb_each(audience_insights))
        WHEN jsonb_typeof(audience_insights) = 'array' THEN
          audience_insights
        ELSE
          '[]'::jsonb
      END
    WHERE audience_insights IS NOT NULL;
    
    -- Drop the old column and rename the new one
    ALTER TABLE onesheet DROP COLUMN IF EXISTS audience_insights;
    ALTER TABLE onesheet RENAME COLUMN audience_insights_temp TO audience_insights;
  ELSE
    -- If column doesn't exist, just add it
    ALTER TABLE onesheet ADD COLUMN audience_insights JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Ensure all JSONB columns have proper defaults
ALTER TABLE onesheet 
ALTER COLUMN audience_insights SET DEFAULT '[]'::jsonb;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_onesheet_social_listening ON onesheet USING gin (social_listening_data);
CREATE INDEX IF NOT EXISTS idx_onesheet_organic_research ON onesheet USING gin (organic_research_data);
CREATE INDEX IF NOT EXISTS idx_onesheet_audience_insights ON onesheet USING gin (audience_insights);

-- Update RLS policies to ensure users can only access their own OneSheets
ALTER TABLE onesheet ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own OneSheets" ON onesheet;
DROP POLICY IF EXISTS "Users can create their own OneSheets" ON onesheet;
DROP POLICY IF EXISTS "Users can update their own OneSheets" ON onesheet;
DROP POLICY IF EXISTS "Users can delete their own OneSheets" ON onesheet;

-- Create new policies
CREATE POLICY "Users can view their own OneSheets"
  ON onesheet FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own OneSheets"
  ON onesheet FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OneSheets"
  ON onesheet FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own OneSheets"
  ON onesheet FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE onesheet IS 'Creative Strategy OneSheet - Central documentation hub for Facebook ad creative research following the 4-step process';

-- Add comments to new columns
COMMENT ON COLUMN onesheet.social_listening_data IS 'Data extracted from Reddit, Quora, and ad comments for social listening';
COMMENT ON COLUMN onesheet.organic_research_data IS 'Organic content research from TikTok and YouTube Shorts';
COMMENT ON COLUMN onesheet.ad_performance_data IS 'Historical ad performance data for account audit';
COMMENT ON COLUMN onesheet.ai_prompt_templates IS 'AI prompt templates for various research tasks';
COMMENT ON COLUMN onesheet.brainstorm_notes IS 'Additional notes from creative brainstorming sessions';
COMMENT ON COLUMN onesheet.custom_sections IS 'Custom sections added by users for flexibility'; 
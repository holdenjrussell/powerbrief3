-- Enhance OneSheet with synthesis and improved persona structure
-- This migration adds the living document synthesis capabilities

-- First, update the personas structure to include all the new fields
ALTER TABLE onesheet 
ADD COLUMN IF NOT EXISTS synthesis_data JSONB DEFAULT '{
  "angles": [],
  "benefits": [],
  "painPoints": [],
  "features": [],
  "objections": [],
  "failedSolutions": [],
  "other": []
}'::jsonb,
ADD COLUMN IF NOT EXISTS last_synthesis_update TIMESTAMP WITH TIME ZONE;

-- Update the competitor_analysis structure to include new fields
DO $$
BEGIN
  -- Check if we need to migrate existing competitor data
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'onesheet' 
    AND column_name = 'competitor_analysis'
  ) THEN
    -- Update existing competitor analysis to include new fields
    UPDATE onesheet 
    SET competitor_analysis = (
      SELECT jsonb_agg(
        competitor || jsonb_build_object(
          'landingPagesUsed', COALESCE(competitor->'landingPagesUsed', '[]'::jsonb),
          'adLinks', COALESCE(competitor->'adLinks', '[]'::jsonb),
          'isHigherQuality', COALESCE(competitor->>'isHigherQuality', ''),
          'whyBetterChoice', COALESCE(competitor->>'whyBetterChoice', ''),
          'formatStrategies', COALESCE(competitor->'formatStrategies', '[]'::jsonb),
          'creatorStrategies', COALESCE(competitor->'creatorStrategies', '[]'::jsonb),
          'learningsOverTime', COALESCE(competitor->'learningsOverTime', '[]'::jsonb)
        )
      )
      FROM jsonb_array_elements(competitor_analysis) AS competitor
    )
    WHERE jsonb_typeof(competitor_analysis) = 'array';
  END IF;
END $$;

-- Update personas structure to include all demographic and psychographic fields
DO $$
BEGIN
  -- Check if we need to migrate existing persona data
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'onesheet' 
    AND column_name = 'personas'
  ) THEN
    -- Update existing personas to ensure all fields are present
    UPDATE onesheet 
    SET personas = (
      SELECT jsonb_agg(
        persona || jsonb_build_object(
          'demographics', COALESCE(
            persona->'demographics',
            jsonb_build_object(
              'age', '',
              'gender', '',
              'location', '',
              'income', '',
              'education', '',
              'occupation', ''
            )
          ),
          'psychographics', COALESCE(
            persona->'psychographics',
            jsonb_build_object(
              'interests', '[]'::jsonb,
              'lifestyle', '[]'::jsonb,
              'values', '[]'::jsonb,
              'painPoints', '[]'::jsonb
            )
          ),
          'awarenessLevel', COALESCE(persona->>'awarenessLevel', 'unaware'),
          'customerLanguage', COALESCE(persona->'customerLanguage', '[]'::jsonb)
        )
      )
      FROM jsonb_array_elements(personas) AS persona
    )
    WHERE jsonb_typeof(personas) = 'array';
  END IF;
END $$;

-- Update audience_insights to ensure proper supporting evidence structure
DO $$
BEGIN
  -- Ensure all audience insights have the proper structure
  UPDATE onesheet 
  SET audience_insights = (
    SELECT jsonb_agg(
      insight || jsonb_build_object(
        'supportingEvidence', jsonb_build_object(
          'reviews', COALESCE((insight->'supportingEvidence'->>'reviews')::jsonb, '[]'::jsonb),
          'information', COALESCE((insight->'supportingEvidence'->>'information')::jsonb, '[]'::jsonb),
          'statistics', COALESCE((insight->'supportingEvidence'->>'statistics')::jsonb, '[]'::jsonb)
        )
      )
    )
    FROM jsonb_array_elements(audience_insights) AS insight
  )
  WHERE jsonb_typeof(audience_insights) = 'array'
  AND audience_insights IS NOT NULL;
END $$;

-- Add indexes for the new synthesis data
CREATE INDEX IF NOT EXISTS idx_onesheet_synthesis ON onesheet USING gin (synthesis_data);
CREATE INDEX IF NOT EXISTS idx_onesheet_last_synthesis ON onesheet (last_synthesis_update);

-- Add comments
COMMENT ON COLUMN onesheet.synthesis_data IS 'Living document synthesis that constantly updates with categorized insights';
COMMENT ON COLUMN onesheet.last_synthesis_update IS 'Timestamp of the last synthesis update';

-- Create a function to update synthesis timestamp
CREATE OR REPLACE FUNCTION update_onesheet_synthesis_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.synthesis_data IS DISTINCT FROM NEW.synthesis_data THEN
    NEW.last_synthesis_update = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic synthesis timestamp update
DROP TRIGGER IF EXISTS update_onesheet_synthesis_timestamp_trigger ON onesheet;
CREATE TRIGGER update_onesheet_synthesis_timestamp_trigger
BEFORE UPDATE ON onesheet
FOR EACH ROW
EXECUTE FUNCTION update_onesheet_synthesis_timestamp(); 
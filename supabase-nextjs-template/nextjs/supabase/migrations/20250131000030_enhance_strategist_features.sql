-- Add enhanced strategist features to onesheet_ai_instructions
ALTER TABLE onesheet_ai_instructions
ADD COLUMN IF NOT EXISTS low_performer_criteria JSONB DEFAULT jsonb_build_object(
  'min_spend', 50,
  'max_roas', 1.0,
  'enabled', true
),
ADD COLUMN IF NOT EXISTS iteration_settings JSONB DEFAULT jsonb_build_object(
  'default_count', 5,
  'types', jsonb_build_array('early', 'script', 'fine_tuning', 'late'),
  'enabled_types', jsonb_build_object(
    'early', true,
    'script', true,
    'fine_tuning', true,
    'late', true
  )
);

-- Update the strategist response schema default to include new fields
UPDATE onesheet_ai_instructions
SET strategist_response_schema = jsonb_build_object(
  'type', 'object',
  'properties', jsonb_build_object(
    'summary', jsonb_build_object('type', 'string'),
    'executiveSummary', jsonb_build_object('type', 'string'),
    'topPerformers', jsonb_build_object(
      'type', 'array',
      'items', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'adId', jsonb_build_object('type', 'string'),
          'adName', jsonb_build_object('type', 'string'),
          'spend', jsonb_build_object('type', 'number'),
          'roas', jsonb_build_object('type', 'number'),
          'keySuccessFactors', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string'))
        )
      )
    ),
    'worstPerformers', jsonb_build_object(
      'type', 'array',
      'items', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'adId', jsonb_build_object('type', 'string'),
          'adName', jsonb_build_object('type', 'string'),
          'spend', jsonb_build_object('type', 'number'),
          'roas', jsonb_build_object('type', 'number'),
          'failureReasons', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string'))
        )
      )
    ),
    'lowPerformers', jsonb_build_object(
      'type', 'array',
      'items', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'adId', jsonb_build_object('type', 'string'),
          'adName', jsonb_build_object('type', 'string'),
          'spend', jsonb_build_object('type', 'number'),
          'roas', jsonb_build_object('type', 'number'),
          'issues', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string'))
        )
      )
    ),
    'whatWorks', jsonb_build_object(
      'type', 'object',
      'properties', jsonb_build_object(
        'hooks', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
        'angles', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
        'formats', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
        'emotions', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
        'frameworks', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
        'visualElements', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
        'contentVariables', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string'))
      )
    ),
    'whatDoesntWork', jsonb_build_object(
      'type', 'object',
      'properties', jsonb_build_object(
        'hooks', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
        'angles', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
        'formats', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
        'emotions', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
        'frameworks', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
        'visualElements', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
        'contentVariables', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string'))
      )
    ),
    'creativePatterns', jsonb_build_object(
      'type', 'object',
      'properties', jsonb_build_object(
        'winningElements', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
        'losingElements', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
        'optimalSitInProblemRange', jsonb_build_object('type', 'string'),
        'bestPerformingHooks', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string'))
      )
    ),
    'recommendations', jsonb_build_object(
      'type', 'array',
      'items', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'priority', jsonb_build_object('type', 'string'),
          'recommendation', jsonb_build_object('type', 'string'),
          'expectedImpact', jsonb_build_object('type', 'string')
        )
      )
    ),
    'netNewConcepts', jsonb_build_object(
      'type', 'array',
      'items', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'title', jsonb_build_object('type', 'string'),
          'description', jsonb_build_object('type', 'string'),
          'type', jsonb_build_object('type', 'string'),
          'duration', jsonb_build_object('type', 'string'),
          'productIntroSuggestion', jsonb_build_object('type', 'string'),
          'sitInProblemSuggestion', jsonb_build_object('type', 'string'),
          'creatorsNeeded', jsonb_build_object('type', 'number'),
          'angle', jsonb_build_object('type', 'string'),
          'awarenessLevel', jsonb_build_object('type', 'string'),
          'contentVariables', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
          'format', jsonb_build_object('type', 'string'),
          'emotion', jsonb_build_object('type', 'string'),
          'framework', jsonb_build_object('type', 'string'),
          'hookSuggestions', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
          'visualNotes', jsonb_build_object('type', 'string')
        )
      )
    ),
    'iterationSuggestions', jsonb_build_object(
      'type', 'array',
      'items', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'adId', jsonb_build_object('type', 'string'),
          'adName', jsonb_build_object('type', 'string'),
          'currentPerformance', jsonb_build_object(
            'type', 'object',
            'properties', jsonb_build_object(
              'spend', jsonb_build_object('type', 'number'),
              'roas', jsonb_build_object('type', 'number'),
              'hookRate', jsonb_build_object('type', 'number'),
              'holdRate', jsonb_build_object('type', 'number')
            )
          ),
          'iterationType', jsonb_build_object('type', 'string'),
          'suggestions', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
          'rationale', jsonb_build_object('type', 'string'),
          'expectedImprovement', jsonb_build_object('type', 'string')
        )
      )
    )
  ),
  'required', ARRAY['summary', 'executiveSummary', 'topPerformers', 'worstPerformers', 'lowPerformers', 
                    'whatWorks', 'whatDoesntWork', 'creativePatterns', 'recommendations', 
                    'netNewConcepts', 'iterationSuggestions']
)
WHERE strategist_response_schema IS NULL;

-- Create a table to store strategist analysis history with CRUD
CREATE TABLE IF NOT EXISTS onesheet_strategist_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  onesheet_id UUID NOT NULL REFERENCES onesheet(id) ON DELETE CASCADE,
  brand_id TEXT NOT NULL,
  analysis_data JSONB NOT NULL,
  analysis_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_archived BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_strategist_analyses_onesheet ON onesheet_strategist_analyses(onesheet_id);
CREATE INDEX IF NOT EXISTS idx_strategist_analyses_brand ON onesheet_strategist_analyses(brand_id);
CREATE INDEX IF NOT EXISTS idx_strategist_analyses_created ON onesheet_strategist_analyses(created_at DESC);

-- Enable RLS
ALTER TABLE onesheet_strategist_analyses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view strategist analyses for their brands" ON onesheet_strategist_analyses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = brand_id 
      AND (brands.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM brand_shares 
        WHERE brand_shares.brand_id = brands.id 
        AND brand_shares.shared_with_user_id = auth.uid() 
        AND brand_shares.status = 'accepted'
      ))
    )
  );

CREATE POLICY "Users can create strategist analyses for their brands" ON onesheet_strategist_analyses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = brand_id 
      AND (brands.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM brand_shares 
        WHERE brand_shares.brand_id = brands.id 
        AND brand_shares.shared_with_user_id = auth.uid() 
        AND brand_shares.status = 'accepted'
      ))
    )
  );

CREATE POLICY "Users can update strategist analyses for their brands" ON onesheet_strategist_analyses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = brand_id 
      AND (brands.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM brand_shares 
        WHERE brand_shares.brand_id = brands.id 
        AND brand_shares.shared_with_user_id = auth.uid() 
        AND brand_shares.status = 'accepted'
      ))
    )
  );

CREATE POLICY "Users can delete strategist analyses for their brands" ON onesheet_strategist_analyses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = brand_id 
      AND brands.user_id = auth.uid()
    )
  );

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_strategist_analyses_updated_at 
  BEFORE UPDATE ON onesheet_strategist_analyses 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 
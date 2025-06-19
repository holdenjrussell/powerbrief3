-- OneSheet Audience Research Stages Migration
-- This migration adds the new stages for OneSheet after context collection

-- Stage 1: Audience Research Data
ALTER TABLE onesheet
ADD COLUMN IF NOT EXISTS audience_research JSONB DEFAULT '{
  "angles": [],
  "benefits": [],
  "painPoints": [],
  "features": [],
  "objections": [],
  "failedSolutions": [],
  "other": [],
  "personas": []
}';

-- Stage 2: Competitor Research Data
ALTER TABLE onesheet
ADD COLUMN IF NOT EXISTS competitor_research JSONB DEFAULT '{
  "competitors": [],
  "deepAnalysis": {
    "qualityComparison": {},
    "formatStrategies": {},
    "creatorApproaches": {},
    "learningsOverTime": []
  }
}';

-- Stage 3: Ad Account Audit Enhanced
ALTER TABLE onesheet
ADD COLUMN IF NOT EXISTS ad_account_audit JSONB DEFAULT '{
  "ads": [],
  "demographicBreakdown": {
    "age": {},
    "gender": {},
    "placement": {}
  },
  "performanceByAngle": {},
  "performanceByFormat": {},
  "performanceByEmotion": {},
  "performanceByFramework": {}
}';

-- Stage 4: Creative Brainstorm
ALTER TABLE onesheet
ADD COLUMN IF NOT EXISTS creative_brainstorm JSONB DEFAULT '{
  "concepts": [],
  "hooks": [],
  "visuals": []
}';

-- Add stage tracking
ALTER TABLE onesheet
ADD COLUMN IF NOT EXISTS current_stage TEXT DEFAULT 'context_loading' CHECK (current_stage IN (
  'context_loading',
  'audience_research',
  'competitor_research',
  'ad_audit',
  'creative_brainstorm',
  'completed'
)),
ADD COLUMN IF NOT EXISTS stages_completed JSONB DEFAULT '{
  "context": false,
  "audience_research": false,
  "competitor_research": false,
  "ad_audit": false,
  "creative_brainstorm": false
}';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_onesheet_current_stage ON onesheet(current_stage);

-- Add comments for documentation
COMMENT ON COLUMN onesheet.audience_research IS 'Stage 1: AI-generated and manually edited audience insights including angles, benefits, pain points, features, objections, failed solutions, and personas';
COMMENT ON COLUMN onesheet.competitor_research IS 'Stage 2: Competitor analysis auto-populated from context with deep analysis questions';
COMMENT ON COLUMN onesheet.ad_account_audit IS 'Stage 3: Historical ad performance data with demographic breakdowns and performance metrics';
COMMENT ON COLUMN onesheet.creative_brainstorm IS 'Stage 4: Creative concepts, hooks, and visuals generated from research';
COMMENT ON COLUMN onesheet.current_stage IS 'Current workflow stage the user is on';
COMMENT ON COLUMN onesheet.stages_completed IS 'Tracking which stages have been completed'; 
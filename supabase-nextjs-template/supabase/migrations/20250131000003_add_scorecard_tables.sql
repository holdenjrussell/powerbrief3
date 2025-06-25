-- Add scorecard infrastructure for Meta API metrics tracking

-- First, check if scorecard_metrics table exists and alter it if needed
DO $$
BEGIN
  -- Check if the table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scorecard_metrics') THEN
    -- Table exists, so we need to alter it to add our new columns
    
    -- Drop existing policies that might conflict
    DROP POLICY IF EXISTS "Users can manage their own scorecard metrics" ON scorecard_metrics;
    
    -- Add new columns if they don't exist
    ALTER TABLE scorecard_metrics 
      ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS metric_key TEXT,
      ADD COLUMN IF NOT EXISTS display_name TEXT,
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS metric_type TEXT,
      ADD COLUMN IF NOT EXISTS calculation_formula TEXT,
      ADD COLUMN IF NOT EXISTS meta_fields TEXT[],
      ADD COLUMN IF NOT EXISTS goal_value DECIMAL,
      ADD COLUMN IF NOT EXISTS goal_operator TEXT,
      ADD COLUMN IF NOT EXISTS meta_campaigns TEXT[],
      ADD COLUMN IF NOT EXISTS is_percentage BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_currency BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS decimal_places INTEGER DEFAULT 2;
    
    -- Add constraints only if columns exist and are nullable
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'scorecard_metrics' 
               AND column_name = 'metric_key' 
               AND is_nullable = 'YES') THEN
      ALTER TABLE scorecard_metrics ALTER COLUMN metric_key SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'scorecard_metrics' 
               AND column_name = 'display_name' 
               AND is_nullable = 'YES') THEN
      ALTER TABLE scorecard_metrics ALTER COLUMN display_name SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'scorecard_metrics' 
               AND column_name = 'metric_type' 
               AND is_nullable = 'YES') THEN
      ALTER TABLE scorecard_metrics ALTER COLUMN metric_type SET NOT NULL;
    END IF;
    
    -- Add check constraint if it doesn't exist
    DO $constraint$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'scorecard_metrics_metric_type_check'
      ) THEN
        ALTER TABLE scorecard_metrics 
          ADD CONSTRAINT scorecard_metrics_metric_type_check 
          CHECK (metric_type IN ('standard', 'creative_testing', 'custom'));
      END IF;
      
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'scorecard_metrics_goal_operator_check'
      ) THEN
        ALTER TABLE scorecard_metrics 
          ADD CONSTRAINT scorecard_metrics_goal_operator_check 
          CHECK (goal_operator IN ('gt', 'gte', 'lt', 'lte', 'eq'));
      END IF;
    END $constraint$;
    
    -- Add unique constraint
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'scorecard_metrics_brand_team_key_unique'
    ) THEN
      ALTER TABLE scorecard_metrics 
        ADD CONSTRAINT scorecard_metrics_brand_team_key_unique 
        UNIQUE(brand_id, team_id, metric_key);
    END IF;
    
    -- Drop the old metric_config column if it exists
    ALTER TABLE scorecard_metrics DROP COLUMN IF EXISTS metric_config;
    
  ELSE
    -- Table doesn't exist, create it
    CREATE TABLE scorecard_metrics (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
      team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      metric_key TEXT NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      metric_type TEXT NOT NULL CHECK (metric_type IN ('standard', 'creative_testing', 'custom')),
      calculation_formula TEXT,
      meta_fields TEXT[],
      goal_value DECIMAL,
      goal_operator TEXT CHECK (goal_operator IN ('gt', 'gte', 'lt', 'lte', 'eq')),
      meta_campaigns TEXT[],
      is_percentage BOOLEAN DEFAULT false,
      is_currency BOOLEAN DEFAULT false,
      decimal_places INTEGER DEFAULT 2,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(brand_id, team_id, metric_key)
    );
  END IF;
END $$;

-- Create scorecard data table for storing calculated values
CREATE TABLE IF NOT EXISTS scorecard_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_id UUID REFERENCES scorecard_metrics(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('week', 'month', 'quarter', 'year')),
  value DECIMAL NOT NULL,
  raw_data JSONB, -- Store raw Meta API response for debugging
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(metric_id, period_start, period_end)
);

-- Create table for scorecard metric issues
ALTER TABLE issues
ADD COLUMN IF NOT EXISTS source_metric_id UUID REFERENCES scorecard_metrics(id),
ADD COLUMN IF NOT EXISTS metric_context JSONB; -- Store metric value, goal, status at time of issue creation

-- Enable RLS
ALTER TABLE scorecard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_data ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on scorecard_metrics
DROP POLICY IF EXISTS "Users can view scorecard metrics" ON scorecard_metrics;
DROP POLICY IF EXISTS "Brand owners can manage scorecard metrics" ON scorecard_metrics;

-- Scorecard metrics policies
CREATE POLICY "Users can view scorecard metrics"
  ON scorecard_metrics FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id FROM brands WHERE user_id = auth.uid()
      UNION
      SELECT brand_id FROM brand_shares WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Brand owners can manage scorecard metrics"
  ON scorecard_metrics FOR ALL
  USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- Scorecard data policies
CREATE POLICY "Users can view scorecard data"
  ON scorecard_data FOR SELECT
  USING (
    metric_id IN (
      SELECT id FROM scorecard_metrics sm
      WHERE sm.brand_id IN (
        SELECT brand_id FROM brands WHERE user_id = auth.uid()
        UNION
        SELECT brand_id FROM brand_shares WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

CREATE POLICY "Brand owners can manage scorecard data"
  ON scorecard_data FOR ALL
  USING (
    metric_id IN (
      SELECT sm.id FROM scorecard_metrics sm
      JOIN brands b ON sm.brand_id = b.id
      WHERE b.user_id = auth.uid()
    )
  );

-- Create function to initialize default metrics for a team
CREATE OR REPLACE FUNCTION create_default_scorecard_metrics(p_brand_id UUID, p_team_id UUID)
RETURNS void AS $$
BEGIN
  -- Meta account ROAS
  INSERT INTO scorecard_metrics (brand_id, team_id, metric_key, display_name, description, metric_type, calculation_formula, meta_fields, is_percentage, decimal_places)
  VALUES (
    p_brand_id, 
    p_team_id, 
    'meta_account_roas',
    'Meta Account ROAS',
    'Return on Ad Spend across all Meta campaigns',
    'standard',
    'purchase_roas.omni_purchase',
    ARRAY['purchase_roas', 'spend'],
    false,
    2
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  -- Meta account spend
  INSERT INTO scorecard_metrics (brand_id, team_id, metric_key, display_name, description, metric_type, meta_fields, is_currency, decimal_places)
  VALUES (
    p_brand_id,
    p_team_id,
    'meta_account_spend',
    'Meta Account Spend',
    'Total ad spend across all Meta campaigns',
    'standard',
    ARRAY['spend'],
    true,
    2
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  -- Meta account revenue
  INSERT INTO scorecard_metrics (brand_id, team_id, metric_key, display_name, description, metric_type, calculation_formula, meta_fields, is_currency, decimal_places)
  VALUES (
    p_brand_id,
    p_team_id,
    'meta_account_revenue',
    'Meta Account Revenue',
    'Total revenue from Meta campaigns',
    'standard',
    'action_values.omni_purchase',
    ARRAY['action_values'],
    true,
    2
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  -- Click through rate
  INSERT INTO scorecard_metrics (brand_id, team_id, metric_key, display_name, description, metric_type, calculation_formula, meta_fields, is_percentage, decimal_places)
  VALUES (
    p_brand_id,
    p_team_id,
    'click_through_rate',
    'Click Through Rate (Link)',
    'Percentage of impressions that resulted in link clicks',
    'standard',
    'link_clicks / impressions * 100',
    ARRAY['link_clicks', 'impressions'],
    true,
    2
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  -- Click to purchase rate
  INSERT INTO scorecard_metrics (brand_id, team_id, metric_key, display_name, description, metric_type, calculation_formula, meta_fields, is_percentage, decimal_places)
  VALUES (
    p_brand_id,
    p_team_id,
    'click_to_purchase_rate',
    'Click to Purchase Rate',
    'Percentage of link clicks that resulted in purchases',
    'standard',
    'actions.omni_purchase / link_clicks * 100',
    ARRAY['actions', 'link_clicks'],
    true,
    2
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  -- Cost per unique link click
  INSERT INTO scorecard_metrics (brand_id, team_id, metric_key, display_name, description, metric_type, calculation_formula, meta_fields, is_currency, decimal_places)
  VALUES (
    p_brand_id,
    p_team_id,
    'cost_per_unique_link_click',
    'Cost per Unique Link Click',
    'Average cost for each unique link click',
    'standard',
    'spend / unique_link_clicks',
    ARRAY['spend', 'unique_link_clicks'],
    true,
    2
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  -- Creative testing metrics (initially without campaigns selected)
  INSERT INTO scorecard_metrics (brand_id, team_id, metric_key, display_name, description, metric_type, meta_fields, decimal_places)
  VALUES (
    p_brand_id,
    p_team_id,
    'creative_testing_roas',
    'Creative Testing ROAS',
    'ROAS for selected creative testing campaigns',
    'creative_testing',
    ARRAY['purchase_roas', 'spend'],
    2
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  INSERT INTO scorecard_metrics (brand_id, team_id, metric_key, display_name, description, metric_type, meta_fields, is_currency)
  VALUES (
    p_brand_id,
    p_team_id,
    'creative_testing_spend',
    'Creative Testing Spend',
    'Spend for selected creative testing campaigns',
    'creative_testing',
    ARRAY['spend'],
    true
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  INSERT INTO scorecard_metrics (brand_id, team_id, metric_key, display_name, description, metric_type, meta_fields, is_currency)
  VALUES (
    p_brand_id,
    p_team_id,
    'creative_testing_revenue',
    'Creative Testing Revenue',
    'Revenue from selected creative testing campaigns',
    'creative_testing',
    ARRAY['action_values'],
    true
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  -- Video/Image ads metrics (placeholders - need to determine calculation method)
  INSERT INTO scorecard_metrics (brand_id, team_id, metric_key, display_name, description, metric_type, meta_fields, decimal_places)
  VALUES (
    p_brand_id,
    p_team_id,
    'video_ads_roas',
    'Video Ads ROAS',
    'ROAS for video ad formats',
    'custom',
    ARRAY['purchase_roas', 'spend'],
    2
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  INSERT INTO scorecard_metrics (brand_id, team_id, metric_key, display_name, description, metric_type, meta_fields, decimal_places)
  VALUES (
    p_brand_id,
    p_team_id,
    'image_ads_roas',
    'Image Ads ROAS',
    'ROAS for image ad formats',
    'custom',
    ARRAY['purchase_roas', 'spend'],
    2
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize scorecard metrics when a team is created
CREATE OR REPLACE FUNCTION handle_new_team_scorecard()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_scorecard_metrics(NEW.brand_id, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_team_created_create_scorecard
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_team_scorecard();

-- Initialize scorecard metrics for existing teams
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, brand_id FROM teams LOOP
    PERFORM create_default_scorecard_metrics(r.brand_id, r.id);
  END LOOP;
END $$;

-- Add indexes for performance
CREATE INDEX idx_scorecard_metrics_brand_team ON scorecard_metrics(brand_id, team_id);
CREATE INDEX idx_scorecard_data_metric_period ON scorecard_data(metric_id, period_start, period_end);
CREATE INDEX idx_scorecard_data_period ON scorecard_data(period_start, period_end);
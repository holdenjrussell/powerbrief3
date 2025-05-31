-- Add Scorecard Metrics functionality
-- This migration creates tables for storing scorecard metrics, goals, and tracking data

-- Create scorecard_metrics table to store metric definitions
CREATE TABLE IF NOT EXISTS public.scorecard_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('meta_api', 'custom')),
    
    -- For Meta API metrics
    meta_metric_name TEXT, -- e.g., 'spend', 'impressions', 'clicks', 'roas'
    meta_ad_account_id TEXT,
    meta_level TEXT, -- 'account', 'campaign', 'adset', 'ad'
    meta_breakdowns TEXT[], -- Array of breakdown dimensions
    
    -- Campaign filtering
    campaign_name_filters JSONB, -- JSON object for campaign name filtering rules
    is_default_metric BOOLEAN DEFAULT false, -- Flag for default metrics that need configuration
    requires_configuration BOOLEAN DEFAULT false, -- Flag indicating metric needs to be configured
    
    -- For custom metrics (mathematical operations on other metrics)
    custom_formula JSONB, -- JSON structure for mathematical operations
    custom_metrics_used UUID[], -- Array of metric IDs used in formula
    
    -- Goals and tracking
    weekly_goal DECIMAL,
    monthly_goal DECIMAL,
    quarterly_goal DECIMAL,
    annual_goal DECIMAL,
    
    -- Status tracking logic
    status_calculation_method TEXT DEFAULT 'average_based' CHECK (status_calculation_method IN ('average_based', 'trend_based', 'threshold_based')),
    
    -- Display settings
    display_format TEXT DEFAULT 'number' CHECK (display_format IN ('number', 'currency', 'percentage')),
    decimal_places INTEGER DEFAULT 2,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create scorecard_metric_data table to store actual metric values by time period
CREATE TABLE IF NOT EXISTS public.scorecard_metric_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_id UUID NOT NULL REFERENCES public.scorecard_metrics(id) ON DELETE CASCADE,
    time_period TEXT NOT NULL, -- 'weekly', 'monthly', 'quarterly', 'annual'
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    value DECIMAL NOT NULL,
    
    -- Meta data for debugging/tracking
    raw_meta_data JSONB, -- Store raw Meta API response for debugging
    calculation_details JSONB, -- For custom metrics, store how the value was calculated
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one record per metric per time period
    UNIQUE(metric_id, time_period, period_start_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS scorecard_metrics_user_id_idx ON public.scorecard_metrics(user_id);
CREATE INDEX IF NOT EXISTS scorecard_metrics_type_idx ON public.scorecard_metrics(type);
CREATE INDEX IF NOT EXISTS scorecard_metrics_meta_ad_account_id_idx ON public.scorecard_metrics(meta_ad_account_id);

CREATE INDEX IF NOT EXISTS scorecard_metric_data_metric_id_idx ON public.scorecard_metric_data(metric_id);
CREATE INDEX IF NOT EXISTS scorecard_metric_data_time_period_idx ON public.scorecard_metric_data(time_period);
CREATE INDEX IF NOT EXISTS scorecard_metric_data_period_dates_idx ON public.scorecard_metric_data(period_start_date, period_end_date);

-- Enable RLS
ALTER TABLE public.scorecard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorecard_metric_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own scorecard metrics" ON public.scorecard_metrics
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage metric data for their own metrics" ON public.scorecard_metric_data
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.scorecard_metrics sm 
            WHERE sm.id = scorecard_metric_data.metric_id 
            AND sm.user_id = auth.uid()
        )
    );

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_scorecard_metrics_updated_at 
    BEFORE UPDATE ON public.scorecard_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scorecard_metric_data_updated_at 
    BEFORE UPDATE ON public.scorecard_metric_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default Meta API metrics for users to start with
-- (These will be user-specific when they access the scorecard for the first time)

COMMENT ON TABLE public.scorecard_metrics IS 'Stores metric definitions for the scorecard dashboard';
COMMENT ON TABLE public.scorecard_metric_data IS 'Stores actual metric values by time period';

COMMENT ON COLUMN public.scorecard_metrics.type IS 'Type of metric: meta_api for Meta Insights API, custom for calculated metrics';
COMMENT ON COLUMN public.scorecard_metrics.meta_metric_name IS 'Name of the Meta API metric (spend, impressions, clicks, etc.)';
COMMENT ON COLUMN public.scorecard_metrics.custom_formula IS 'JSON formula for custom metrics: {"operation": "divide", "numerator": "metric_id_1", "denominator": "metric_id_2"}';
COMMENT ON COLUMN public.scorecard_metrics.status_calculation_method IS 'How to calculate on-track/off-track status';
COMMENT ON COLUMN public.scorecard_metric_data.time_period IS 'Time period for this data point: weekly, monthly, quarterly, annual';
COMMENT ON COLUMN public.scorecard_metric_data.raw_meta_data IS 'Raw Meta API response for debugging and auditing';
COMMENT ON COLUMN public.scorecard_metric_data.calculation_details IS 'Details of how custom metric values were calculated'; 
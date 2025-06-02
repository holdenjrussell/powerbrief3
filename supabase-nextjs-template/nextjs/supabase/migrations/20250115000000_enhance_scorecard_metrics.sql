-- Enhance Scorecard Metrics for NewMetric interface compatibility
-- This migration adds columns to support the enhanced scorecard functionality

-- Add missing columns to scorecard_metrics table to match NewMetric interface
ALTER TABLE public.scorecard_metrics 
ADD COLUMN IF NOT EXISTS period_interval TEXT DEFAULT 'weekly' CHECK (period_interval IN ('weekly', 'monthly', 'quarterly', 'annual')),
ADD COLUMN IF NOT EXISTS show_total BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_average BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_goal BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS goal_unit TEXT DEFAULT 'number' CHECK (goal_unit IN ('number', 'percentage', 'currency', 'yes/no', 'time')),
ADD COLUMN IF NOT EXISTS goal_orientation TEXT DEFAULT 'ge_goal' CHECK (goal_orientation IN ('inside_min_max', 'outside_min_max', 'ge_goal', 'gt_goal', 'eq_goal', 'lt_goal', 'le_goal')),
ADD COLUMN IF NOT EXISTS goal_value DECIMAL,
ADD COLUMN IF NOT EXISTS goal_min_value DECIMAL,
ADD COLUMN IF NOT EXISTS goal_max_value DECIMAL,
ADD COLUMN IF NOT EXISTS trailing_calculation TEXT DEFAULT 'total' CHECK (trailing_calculation IN ('total', 'average')),
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'live_meta' CHECK (data_source IN ('live_meta', 'manual_input')),
ADD COLUMN IF NOT EXISTS formula JSONB, -- Store FormulaItem[] as JSON
ADD COLUMN IF NOT EXISTS allow_manual_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ad_set_name_filters JSONB, -- Store AdSetFilter[] as JSON  
ADD COLUMN IF NOT EXISTS ad_name_filters JSONB; -- Store AdFilter[] as JSON

-- Update the campaign_name_filters column type to match the new filter structure
-- The existing column stores filters differently than our NewMetric interface expects
-- We'll keep both for backward compatibility
ALTER TABLE public.scorecard_metrics 
ADD COLUMN IF NOT EXISTS campaign_name_filters_v2 JSONB; -- Store CampaignFilter[] as JSON

-- Create a table for manual metric data entries
CREATE TABLE IF NOT EXISTS public.scorecard_manual_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_id UUID NOT NULL REFERENCES public.scorecard_metrics(id) ON DELETE CASCADE,
    period_label TEXT NOT NULL, -- e.g., "Jan 1-7, 2024", "Q1 2024"
    value DECIMAL NOT NULL,
    value_type TEXT DEFAULT 'number' CHECK (value_type IN ('number', 'string')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one entry per metric per period
    UNIQUE(metric_id, period_label)
);

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS scorecard_metrics_period_interval_idx ON public.scorecard_metrics(period_interval);
CREATE INDEX IF NOT EXISTS scorecard_metrics_data_source_idx ON public.scorecard_metrics(data_source);
CREATE INDEX IF NOT EXISTS scorecard_metrics_goal_value_idx ON public.scorecard_metrics(goal_value);

-- Add indexes for manual data table
CREATE INDEX IF NOT EXISTS scorecard_manual_data_metric_id_idx ON public.scorecard_manual_data(metric_id);
CREATE INDEX IF NOT EXISTS scorecard_manual_data_period_label_idx ON public.scorecard_manual_data(period_label);

-- Enable RLS on manual data table
ALTER TABLE public.scorecard_manual_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for manual data
CREATE POLICY "Users can manage manual data for their own metrics" ON public.scorecard_manual_data
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.scorecard_metrics sm 
            WHERE sm.id = scorecard_manual_data.metric_id 
            AND sm.user_id = auth.uid()
        )
    );

-- Add trigger for updated_at on manual data
CREATE TRIGGER update_scorecard_manual_data_updated_at 
    BEFORE UPDATE ON public.scorecard_manual_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments to document the new columns
COMMENT ON COLUMN public.scorecard_metrics.period_interval IS 'Default time period for this metric (weekly, monthly, quarterly, annual)';
COMMENT ON COLUMN public.scorecard_metrics.show_total IS 'Whether to show total column in scorecard view';
COMMENT ON COLUMN public.scorecard_metrics.show_average IS 'Whether to show average column in scorecard view';
COMMENT ON COLUMN public.scorecard_metrics.show_goal IS 'Whether to show goal column in scorecard view';
COMMENT ON COLUMN public.scorecard_metrics.goal_unit IS 'Unit type for goal values (number, percentage, currency, yes/no, time)';
COMMENT ON COLUMN public.scorecard_metrics.goal_orientation IS 'Goal orientation rule for determining success';
COMMENT ON COLUMN public.scorecard_metrics.goal_value IS 'Target goal value';
COMMENT ON COLUMN public.scorecard_metrics.goal_min_value IS 'Minimum value for inside/outside min_max goal orientation';
COMMENT ON COLUMN public.scorecard_metrics.goal_max_value IS 'Maximum value for inside/outside min_max goal orientation';
COMMENT ON COLUMN public.scorecard_metrics.trailing_calculation IS 'How to calculate trailing periods (total or average)';
COMMENT ON COLUMN public.scorecard_metrics.data_source IS 'Source of metric data (live_meta or manual_input)';
COMMENT ON COLUMN public.scorecard_metrics.formula IS 'JSON array of FormulaItem objects for live_meta metrics';
COMMENT ON COLUMN public.scorecard_metrics.allow_manual_override IS 'Whether live_meta metrics can be manually overridden';
COMMENT ON COLUMN public.scorecard_metrics.campaign_name_filters_v2 IS 'JSON array of CampaignFilter objects (new format)';
COMMENT ON COLUMN public.scorecard_metrics.ad_set_name_filters IS 'JSON array of AdSetFilter objects';
COMMENT ON COLUMN public.scorecard_metrics.ad_name_filters IS 'JSON array of AdFilter objects';

COMMENT ON TABLE public.scorecard_manual_data IS 'Stores manually entered metric values by period';
COMMENT ON COLUMN public.scorecard_manual_data.period_label IS 'Human-readable period label matching the UI display';
COMMENT ON COLUMN public.scorecard_manual_data.value IS 'The metric value for this period';
COMMENT ON COLUMN public.scorecard_manual_data.value_type IS 'Type of value stored (number or string)'; 
-- Migration: Add period-specific goals to scorecard metrics
-- Date: 2025-01-31
-- Description: Allow different goal values for weekly, monthly, and quarterly views

-- Add columns for period-specific goals if they don't exist
ALTER TABLE scorecard_metrics
ADD COLUMN IF NOT EXISTS weekly_goal_value DECIMAL,
ADD COLUMN IF NOT EXISTS weekly_goal_operator TEXT CHECK (weekly_goal_operator IN ('gt', 'gte', 'lt', 'lte', 'eq')),
ADD COLUMN IF NOT EXISTS monthly_goal_value DECIMAL,
ADD COLUMN IF NOT EXISTS monthly_goal_operator TEXT CHECK (monthly_goal_operator IN ('gt', 'gte', 'lt', 'lte', 'eq')),
ADD COLUMN IF NOT EXISTS quarterly_goal_value DECIMAL,
ADD COLUMN IF NOT EXISTS quarterly_goal_operator TEXT CHECK (quarterly_goal_operator IN ('gt', 'gte', 'lt', 'lte', 'eq'));

-- Migrate existing goal_value to weekly_goal_value if not already set
UPDATE scorecard_metrics
SET 
  weekly_goal_value = COALESCE(weekly_goal_value, goal_value),
  weekly_goal_operator = COALESCE(weekly_goal_operator, goal_operator)
WHERE goal_value IS NOT NULL AND weekly_goal_value IS NULL;

-- Add comments
COMMENT ON COLUMN scorecard_metrics.weekly_goal_value IS 'Target goal value for weekly time period';
COMMENT ON COLUMN scorecard_metrics.weekly_goal_operator IS 'Goal comparison operator for weekly time period';
COMMENT ON COLUMN scorecard_metrics.monthly_goal_value IS 'Target goal value for monthly time period';
COMMENT ON COLUMN scorecard_metrics.monthly_goal_operator IS 'Goal comparison operator for monthly time period';
COMMENT ON COLUMN scorecard_metrics.quarterly_goal_value IS 'Target goal value for quarterly time period';
COMMENT ON COLUMN scorecard_metrics.quarterly_goal_operator IS 'Goal comparison operator for quarterly time period'; 
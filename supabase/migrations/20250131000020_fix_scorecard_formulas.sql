-- Fix scorecard metrics with invalid calculation formulas
-- These metrics had plain string formulas instead of JSON arrays

-- First, let's check if we need to change the column type
DO $$ 
BEGIN
    -- Check if calculation_formula is text type and change to jsonb if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'scorecard_metrics' 
        AND column_name = 'calculation_formula' 
        AND data_type = 'text'
    ) THEN
        -- Update invalid text formulas to empty JSON array first
        UPDATE scorecard_metrics
        SET calculation_formula = '[]'
        WHERE calculation_formula IS NOT NULL 
          AND calculation_formula NOT LIKE '[%'
          AND calculation_formula NOT LIKE '{%';
          
        -- Change column type to jsonb
        ALTER TABLE scorecard_metrics 
        ALTER COLUMN calculation_formula TYPE jsonb USING calculation_formula::jsonb;
    END IF;
END $$;

-- Update specific metrics with their correct formulas
UPDATE scorecard_metrics
SET calculation_formula = '[{"type":"metric","value":"clicks"},{"type":"operator","value":"/"},{"type":"metric","value":"impressions"},{"type":"operator","value":"*"},{"type":"number","value":"100"}]'::jsonb
WHERE metric_key = 'click_through_rate'
  AND (calculation_formula IS NULL OR calculation_formula::text = '[]');

UPDATE scorecard_metrics
SET calculation_formula = '[{"type":"metric","value":"purchases"},{"type":"operator","value":"/"},{"type":"metric","value":"clicks"},{"type":"operator","value":"*"},{"type":"number","value":"100"}]'::jsonb
WHERE metric_key = 'click_to_purchase_rate'
  AND (calculation_formula IS NULL OR calculation_formula::text = '[]');

UPDATE scorecard_metrics
SET calculation_formula = '[{"type":"metric","value":"spend"},{"type":"operator","value":"/"},{"type":"metric","value":"unique_link_clicks"}]'::jsonb
WHERE metric_key = 'cost_per_unique_link_click'
  AND (calculation_formula IS NULL OR calculation_formula::text = '[]');

-- Ensure all metrics have valid JSON formulas
UPDATE scorecard_metrics
SET calculation_formula = 
  CASE 
    WHEN metric_key = 'spend' THEN '[{"type":"metric","value":"spend"}]'::jsonb
    WHEN metric_key = 'impressions' THEN '[{"type":"metric","value":"impressions"}]'::jsonb
    WHEN metric_key = 'clicks' THEN '[{"type":"metric","value":"clicks"}]'::jsonb
    WHEN metric_key = 'cpm' THEN '[{"type":"metric","value":"cpm"}]'::jsonb
    WHEN metric_key = 'cpc' THEN '[{"type":"metric","value":"cpc"}]'::jsonb
    WHEN metric_key = 'ctr' THEN '[{"type":"metric","value":"ctr"}]'::jsonb
    WHEN metric_key = 'purchase_roas' THEN '[{"type":"metric","value":"purchase_value"},{"type":"operator","value":"/"},{"type":"metric","value":"spend"}]'::jsonb
    WHEN metric_key = 'purchases' THEN '[{"type":"metric","value":"purchases"}]'::jsonb
    WHEN metric_key = 'purchase_value' THEN '[{"type":"metric","value":"purchase_value"}]'::jsonb
    WHEN metric_key = 'cost_per_purchase' THEN '[{"type":"metric","value":"spend"},{"type":"operator","value":"/"},{"type":"metric","value":"purchases"}]'::jsonb
    ELSE calculation_formula
  END
WHERE calculation_formula IS NULL 
   OR calculation_formula::text = '[]'; 
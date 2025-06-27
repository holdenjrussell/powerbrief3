-- Fix NULL calculation formulas for scorecard metrics

-- Update creative_testing_roas metrics
UPDATE scorecard_metrics
SET calculation_formula = '[{"type": "metric", "value": "purchase_value"}, {"type": "operator", "value": "/"}, {"type": "metric", "value": "spend"}]'::jsonb
WHERE metric_key = 'creative_testing_roas' 
  AND calculation_formula IS NULL;

-- Update creative_testing_revenue metrics
UPDATE scorecard_metrics
SET calculation_formula = '[{"type": "metric", "value": "purchase_value"}]'::jsonb
WHERE metric_key = 'creative_testing_revenue' 
  AND calculation_formula IS NULL;

-- Update creative_testing_spend metrics
UPDATE scorecard_metrics
SET calculation_formula = '[{"type": "metric", "value": "spend"}]'::jsonb
WHERE metric_key = 'creative_testing_spend' 
  AND calculation_formula IS NULL;

-- Update meta_account_spend metrics
UPDATE scorecard_metrics
SET calculation_formula = '[{"type": "metric", "value": "spend"}]'::jsonb
WHERE metric_key = 'meta_account_spend' 
  AND calculation_formula IS NULL;

-- Update video_ads_roas metrics
UPDATE scorecard_metrics
SET calculation_formula = '[{"type": "metric", "value": "purchase_value"}, {"type": "operator", "value": "/"}, {"type": "metric", "value": "spend"}]'::jsonb
WHERE metric_key = 'video_ads_roas' 
  AND calculation_formula IS NULL;

-- Update image_ads_roas metrics
UPDATE scorecard_metrics
SET calculation_formula = '[{"type": "metric", "value": "purchase_value"}, {"type": "operator", "value": "/"}, {"type": "metric", "value": "spend"}]'::jsonb
WHERE metric_key = 'image_ads_roas' 
  AND calculation_formula IS NULL;

-- Update any other metrics with NULL formulas based on their key patterns
UPDATE scorecard_metrics
SET calculation_formula = CASE
  WHEN metric_key LIKE '%_roas' THEN '[{"type": "metric", "value": "purchase_value"}, {"type": "operator", "value": "/"}, {"type": "metric", "value": "spend"}]'::jsonb
  WHEN metric_key LIKE '%_revenue' THEN '[{"type": "metric", "value": "purchase_value"}]'::jsonb
  WHEN metric_key LIKE '%_spend' THEN '[{"type": "metric", "value": "spend"}]'::jsonb
  WHEN metric_key LIKE '%_ctr' THEN '[{"type": "metric", "value": "clicks"}, {"type": "operator", "value": "/"}, {"type": "metric", "value": "impressions"}, {"type": "operator", "value": "*"}, {"type": "number", "value": "100"}]'::jsonb
  WHEN metric_key LIKE '%_cpm' THEN '[{"type": "metric", "value": "cpm"}]'::jsonb
  WHEN metric_key LIKE '%_cpc' THEN '[{"type": "metric", "value": "cpc"}]'::jsonb
  ELSE '[{"type": "metric", "value": "spend"}]'::jsonb -- Default fallback
END
WHERE calculation_formula IS NULL; 
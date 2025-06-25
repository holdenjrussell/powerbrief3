-- SCORECARD DATA MIGRATION CHECK
-- Run this to see what data exists in the scorecard_metrics table

-- Show existing data
SELECT 
  id,
  user_id,
  brand_id,
  metric_config,
  created_at
FROM scorecard_metrics
LIMIT 10;

-- Count records by brand
SELECT 
  b.name as brand_name,
  COUNT(sm.id) as metric_count
FROM scorecard_metrics sm
LEFT JOIN brands b ON sm.brand_id = b.id
GROUP BY b.name;

-- Show what's in metric_config JSONB
SELECT 
  id,
  metric_config->>'name' as config_name,
  metric_config->>'type' as config_type,
  jsonb_pretty(metric_config) as full_config
FROM scorecard_metrics
WHERE metric_config IS NOT NULL
LIMIT 5;

-- Preview what the migration will do
SELECT 
  id,
  CASE 
    WHEN metric_config->>'key' IS NOT NULL THEN metric_config->>'key'
    WHEN metric_config->>'name' IS NOT NULL THEN lower(replace(metric_config->>'name', ' ', '_'))
    ELSE 'legacy_metric_' || id::text
  END as proposed_metric_key,
  CASE 
    WHEN metric_config->>'name' IS NOT NULL THEN metric_config->>'name'
    WHEN metric_config->>'title' IS NOT NULL THEN metric_config->>'title'
    ELSE 'Legacy Metric ' || id::text
  END as proposed_display_name,
  CASE 
    WHEN metric_config->>'type' IN ('standard', 'creative_testing', 'custom') THEN metric_config->>'type'
    ELSE 'custom'
  END as proposed_metric_type
FROM scorecard_metrics;

-- Check if we can safely migrate the data
DO $$
DECLARE
  v_record_count INTEGER;
  v_has_metric_config BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_record_count FROM scorecard_metrics;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scorecard_metrics' 
    AND column_name = 'metric_config'
  ) INTO v_has_metric_config;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SCORECARD DATA MIGRATION ANALYSIS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total existing records: %', v_record_count;
  RAISE NOTICE 'Has metric_config column: %', v_has_metric_config;
  
  IF v_record_count > 0 AND v_has_metric_config THEN
    RAISE NOTICE '';
    RAISE NOTICE 'RECOMMENDATION: Consider backing up existing data before migration:';
    RAISE NOTICE 'CREATE TABLE scorecard_metrics_backup AS SELECT * FROM scorecard_metrics;';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
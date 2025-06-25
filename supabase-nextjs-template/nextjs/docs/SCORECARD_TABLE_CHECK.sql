-- SCORECARD TABLE VERIFICATION SCRIPT
-- Run this to check the current state of the scorecard_metrics table

-- Check if scorecard_metrics table exists
SELECT 
  'scorecard_metrics table exists' as check_item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scorecard_metrics')
    THEN '✅ Yes'
    ELSE '❌ No'
  END as status;

-- Show current columns in scorecard_metrics
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'scorecard_metrics'
ORDER BY ordinal_position;

-- Check existing constraints
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'scorecard_metrics'::regclass;

-- Check existing policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'scorecard_metrics';

-- Check if there's any data in the table
SELECT 
  'Records in scorecard_metrics' as metric,
  COUNT(*) as count
FROM scorecard_metrics;

-- Summary
DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_has_team_id BOOLEAN;
  v_has_metric_key BOOLEAN;
BEGIN
  -- Check if table exists
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scorecard_metrics')
  INTO v_table_exists;
  
  -- Check if team_id column exists
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scorecard_metrics' AND column_name = 'team_id')
  INTO v_has_team_id;
  
  -- Check if metric_key column exists
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scorecard_metrics' AND column_name = 'metric_key')
  INTO v_has_metric_key;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SCORECARD TABLE STATUS';
  RAISE NOTICE '========================================';
  
  IF NOT v_table_exists THEN
    RAISE NOTICE '✅ Table does not exist - will be created fresh';
  ELSIF v_has_team_id AND v_has_metric_key THEN
    RAISE NOTICE '✅ Table exists with correct structure';
  ELSIF NOT v_has_team_id THEN
    RAISE NOTICE '⚠️ Table exists but missing team_id - will be altered';
  ELSE
    RAISE NOTICE '⚠️ Table exists but needs updates - will be altered';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
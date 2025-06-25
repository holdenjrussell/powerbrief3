-- TEAMS MIGRATION VERIFICATION SCRIPT
-- Run this BEFORE applying the teams migration to ensure everything will work

-- ============================================================================
-- STEP 1: Verify base tables exist
-- ============================================================================

-- Check if the team sync tables exist with correct names
SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ Table exists'
    ELSE '❌ Table missing'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('announcements', 'todos', 'issues')
ORDER BY table_name;

-- ============================================================================
-- STEP 2: Verify required columns exist
-- ============================================================================

-- Check announcements table columns
SELECT 
  'announcements' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'announcements'
  AND column_name IN ('id', 'user_id', 'brand_id', 'title', 'content', 'priority', 'created_at')
ORDER BY ordinal_position;

-- Check todos table columns
SELECT 
  'todos' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'todos'
  AND column_name IN ('id', 'user_id', 'brand_id', 'title', 'completed', 'assignee_id')
ORDER BY ordinal_position;

-- Check issues table columns
SELECT 
  'issues' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'issues'
  AND column_name IN ('id', 'user_id', 'brand_id', 'title', 'status', 'assignee_id')
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 3: Check if teams columns already exist (to prevent errors)
-- ============================================================================

-- Check if team-related columns already exist
SELECT 
  table_name,
  column_name,
  CASE 
    WHEN column_name IS NOT NULL THEN '⚠️ Column already exists'
    ELSE '✅ Column can be added'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'announcements' AND column_name IN ('is_resolved', 'is_global', 'target_team_ids'))
    OR (table_name = 'todos' AND column_name = 'target_team_id')
    OR (table_name = 'issues' AND column_name IN ('target_team_id', 'source_metric_id', 'metric_context'))
    OR (table_name = 'brand_shares' AND column_name IN ('team_ids', 'first_name', 'last_name'))
  );

-- ============================================================================
-- STEP 4: Verify dependencies
-- ============================================================================

-- Check if brands table exists (required for teams)
SELECT 
  'brands' as dependency,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brands')
    THEN '✅ Dependency exists'
    ELSE '❌ Missing dependency'
  END as status;

-- Check if brand_shares table exists
SELECT 
  'brand_shares' as dependency,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brand_shares')
    THEN '✅ Dependency exists'
    ELSE '❌ Missing dependency'
  END as status;

-- Check if auth.users is accessible
SELECT 
  'auth.users' as dependency,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users')
    THEN '✅ Dependency exists'
    ELSE '❌ Missing dependency'
  END as status;

-- ============================================================================
-- STEP 5: Check for potential conflicts
-- ============================================================================

-- Check if teams table already exists
SELECT 
  'teams table' as check_item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams')
    THEN '⚠️ Table already exists - migration may fail'
    ELSE '✅ No conflict'
  END as status;

-- Check if team_members table already exists
SELECT 
  'team_members table' as check_item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members')
    THEN '⚠️ Table already exists - migration may fail'
    ELSE '✅ No conflict'
  END as status;

-- ============================================================================
-- STEP 6: Verify RLS is enabled on required tables
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS enabled'
    ELSE '⚠️ RLS not enabled'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('announcements', 'todos', 'issues', 'brands', 'brand_shares')
ORDER BY tablename;

-- ============================================================================
-- STEP 7: Check existing data that will be migrated
-- ============================================================================

-- Count existing brands (will get default teams)
SELECT 
  'Brands to receive default teams' as metric,
  COUNT(*) as count
FROM brands;

-- Count existing brand shares (users to be added to teams)
SELECT 
  'Brand share users to be added to teams' as metric,
  COUNT(DISTINCT shared_with_user_id) as count
FROM brand_shares
WHERE status = 'accepted';

-- Count existing announcements, todos, issues
SELECT 
  'announcements' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT brand_id) as brands_with_data
FROM announcements
UNION ALL
SELECT 
  'todos' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT brand_id) as brands_with_data
FROM todos
UNION ALL
SELECT 
  'issues' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT brand_id) as brands_with_data
FROM issues;

-- ============================================================================
-- STEP 8: Pre-flight check summary
-- ============================================================================

DO $$
DECLARE
  v_ready BOOLEAN := true;
  v_warnings INTEGER := 0;
  v_errors INTEGER := 0;
BEGIN
  -- Check critical tables
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'announcements') THEN
    RAISE NOTICE '❌ ERROR: announcements table does not exist';
    v_errors := v_errors + 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'todos') THEN
    RAISE NOTICE '❌ ERROR: todos table does not exist';
    v_errors := v_errors + 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'issues') THEN
    RAISE NOTICE '❌ ERROR: issues table does not exist';
    v_errors := v_errors + 1;
  END IF;
  
  -- Check if teams already exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
    RAISE NOTICE '⚠️ WARNING: teams table already exists';
    v_warnings := v_warnings + 1;
  END IF;
  
  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION PRE-FLIGHT CHECK COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Errors: %', v_errors;
  RAISE NOTICE 'Warnings: %', v_warnings;
  RAISE NOTICE '';
  
  IF v_errors > 0 THEN
    RAISE NOTICE '❌ MIGRATION WILL FAIL - Fix errors before proceeding';
  ELSIF v_warnings > 0 THEN
    RAISE NOTICE '⚠️ MIGRATION MAY HAVE ISSUES - Review warnings';
  ELSE
    RAISE NOTICE '✅ MIGRATION READY - All checks passed';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
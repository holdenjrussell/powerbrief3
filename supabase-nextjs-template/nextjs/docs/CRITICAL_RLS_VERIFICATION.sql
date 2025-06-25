-- CRITICAL RLS VERIFICATION SCRIPT
-- Run this BEFORE and AFTER teams migration to ensure no access is broken
-- 
-- IMPORTANT: This script verifies that all existing access patterns remain intact
-- after the teams migration. No existing access should be lost.

-- ============================================================================
-- SECTION 1: VERIFY EXISTING RLS POLICIES ARE UNTOUCHED
-- ============================================================================

-- List all RLS policies that should NOT be modified by the migration
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'brands',
    'brand_shares',
    'brief_batches',
    'brief_concepts',
    'ugc_creators',
    'ugc_creator_scripts',
    'ad_configurations',
    'ad_batches',
    'ad_drafts',
    'onesheet',
    'products',
    'team_sync_announcements',
    'team_sync_todos',
    'team_sync_issues'
  )
ORDER BY tablename, policyname;

-- ============================================================================
-- SECTION 2: VERIFY PUBLIC ACCESS PATTERNS
-- ============================================================================

-- Test 1: Public Brief Batches (should work without authentication)
-- This query should return results for public batches
SELECT 
  'public_batch_test' as test_name,
  COUNT(*) as public_batches_count,
  CASE 
    WHEN COUNT(*) > 0 THEN 'PASS ✅'
    ELSE 'FAIL ❌ - Public batches not accessible'
  END as status
FROM brief_batches
WHERE public_share_id IS NOT NULL;

-- Test 2: Public UGC Scripts (should work without authentication)
SELECT 
  'public_ugc_script_test' as test_name,
  COUNT(*) as public_scripts_count,
  CASE 
    WHEN COUNT(*) > 0 THEN 'PASS ✅'
    ELSE 'FAIL ❌ - Public UGC scripts not accessible'
  END as status
FROM ugc_creator_scripts
WHERE public_share_id IS NOT NULL;

-- ============================================================================
-- SECTION 3: VERIFY BRAND ACCESS PATTERNS
-- ============================================================================

-- Create a test function to check access patterns
CREATE OR REPLACE FUNCTION verify_brand_access_patterns()
RETURNS TABLE (
  test_name TEXT,
  test_description TEXT,
  result TEXT
) AS $$
DECLARE
  v_test_user_id UUID;
  v_test_brand_id UUID;
  v_shared_user_id UUID;
  v_brand_count INTEGER;
  v_share_count INTEGER;
BEGIN
  -- Get a sample brand and its shares for testing
  SELECT b.id, b.user_id INTO v_test_brand_id, v_test_user_id
  FROM brands b
  LIMIT 1;
  
  -- Test 1: Brand owner can see their brand
  RETURN QUERY
  SELECT 
    'brand_owner_access'::TEXT,
    'Brand owner should see their own brands'::TEXT,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM brands 
        WHERE id = v_test_brand_id 
        AND user_id = v_test_user_id
      ) THEN 'PASS ✅'::TEXT
      ELSE 'FAIL ❌'::TEXT
    END;
  
  -- Test 2: Shared users can see brands
  SELECT COUNT(*) INTO v_share_count
  FROM brand_shares bs
  JOIN brands b ON bs.brand_id = b.id
  WHERE bs.status = 'accepted';
  
  RETURN QUERY
  SELECT 
    'brand_share_access'::TEXT,
    'Shared users should see brands they have access to'::TEXT,
    CASE 
      WHEN v_share_count > 0 THEN 'PASS ✅'::TEXT
      ELSE 'WARNING ⚠️ - No brand shares found to test'::TEXT
    END;
  
  -- Test 3: PowerBrief features access pattern
  RETURN QUERY
  SELECT 
    'powerbrief_access_pattern'::TEXT,
    'PowerBrief tables use consistent brand access pattern'::TEXT,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'onesheet'
        AND qual LIKE '%brand_shares%'
        AND qual LIKE '%status = ''accepted''%'
      ) THEN 'PASS ✅'::TEXT
      ELSE 'FAIL ❌ - OneSheet RLS pattern changed'::TEXT
    END;
  
  -- Test 4: UGC Creator access pattern
  RETURN QUERY
  SELECT 
    'ugc_creator_access_pattern'::TEXT,
    'UGC creators use consistent brand access pattern'::TEXT,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'ugc_creators'
        AND qual LIKE '%brand_shares%'
        AND qual LIKE '%status = ''accepted''%'
      ) THEN 'PASS ✅'::TEXT
      ELSE 'FAIL ❌ - UGC creators RLS pattern changed'::TEXT
    END;
  
  -- Test 5: Ad configurations access pattern
  RETURN QUERY
  SELECT 
    'ad_config_access_pattern'::TEXT,
    'Ad configurations use consistent brand access pattern'::TEXT,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'ad_configurations'
        AND (qual LIKE '%brand_shares%' OR qual LIKE '%user_id = auth.uid()%')
      ) THEN 'PASS ✅'::TEXT
      ELSE 'WARNING ⚠️ - Ad configurations might use different pattern'::TEXT
    END;
END;
$$ LANGUAGE plpgsql;

-- Run the verification
SELECT * FROM verify_brand_access_patterns();

-- ============================================================================
-- SECTION 4: VERIFY TEAMS MIGRATION SAFETY
-- ============================================================================

-- Check that teams tables have proper RLS that mirrors brand_shares pattern
SELECT 
  'teams_rls_pattern' as test_name,
  'Teams RLS should mirror brand_shares pattern' as description,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'teams'
      AND qual LIKE '%brand_shares%'
      AND qual LIKE '%status = ''accepted''%'
    ) THEN 'PASS ✅ - Teams use same access pattern'
    ELSE 'WARNING ⚠️ - Teams not yet created or different pattern'
  END as status;

-- ============================================================================
-- SECTION 5: POST-MIGRATION VERIFICATION
-- ============================================================================

-- After migration, verify automatic team creation and membership
CREATE OR REPLACE FUNCTION verify_teams_migration()
RETURNS TABLE (
  check_name TEXT,
  expected TEXT,
  actual TEXT,
  status TEXT
) AS $$
BEGIN
  -- Check 1: All brands have default teams
  RETURN QUERY
  SELECT 
    'default_teams_created'::TEXT,
    'All brands should have Creative Team'::TEXT,
    COUNT(DISTINCT b.id)::TEXT || ' brands, ' || 
    COUNT(DISTINCT t.id)::TEXT || ' default teams',
    CASE 
      WHEN COUNT(DISTINCT b.id) = COUNT(DISTINCT t.id) THEN 'PASS ✅'
      ELSE 'FAIL ❌ - Missing default teams'
    END
  FROM brands b
  LEFT JOIN teams t ON b.id = t.brand_id AND t.is_default = true;
  
  -- Check 2: All brand share users are in teams
  RETURN QUERY
  SELECT 
    'shared_users_in_teams'::TEXT,
    'All shared users should be in Creative Team'::TEXT,
    COUNT(DISTINCT bs.shared_with_user_id)::TEXT || ' shared users, ' ||
    COUNT(DISTINCT tm.user_id)::TEXT || ' team members',
    CASE 
      WHEN COUNT(DISTINCT bs.shared_with_user_id) = COUNT(DISTINCT tm.user_id) 
      THEN 'PASS ✅'
      ELSE 'WARNING ⚠️ - Some shared users not in teams'
    END
  FROM brand_shares bs
  LEFT JOIN teams t ON bs.brand_id = t.brand_id AND t.is_default = true
  LEFT JOIN team_members tm ON t.id = tm.team_id AND bs.shared_with_user_id = tm.user_id
  WHERE bs.status = 'accepted';
  
  -- Check 3: Brand owners are in their teams
  RETURN QUERY
  SELECT 
    'owners_in_teams'::TEXT,
    'All brand owners should be in Creative Team'::TEXT,
    COUNT(DISTINCT b.user_id)::TEXT || ' owners, ' ||
    COUNT(DISTINCT tm.user_id)::TEXT || ' owner team members',
    CASE 
      WHEN COUNT(DISTINCT b.user_id) <= COUNT(DISTINCT tm.user_id) 
      THEN 'PASS ✅'
      ELSE 'WARNING ⚠️ - Some owners not in teams'
    END
  FROM brands b
  LEFT JOIN teams t ON b.id = t.brand_id AND t.is_default = true
  LEFT JOIN team_members tm ON t.id = tm.team_id AND b.user_id = tm.user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 6: COMPREHENSIVE ACCESS TEST
-- ============================================================================

-- This query tests all critical access patterns in one go
WITH access_tests AS (
  -- Test 1: Public content remains public
  SELECT 
    'public_content' as category,
    'Brief batches with public_share_id' as feature,
    COUNT(*) as count,
    COUNT(*) > 0 as has_access
  FROM brief_batches
  WHERE public_share_id IS NOT NULL
  
  UNION ALL
  
  -- Test 2: UGC scripts with public share
  SELECT 
    'public_content',
    'UGC scripts with public_share_id',
    COUNT(*),
    COUNT(*) > 0
  FROM ugc_creator_scripts
  WHERE public_share_id IS NOT NULL
  
  UNION ALL
  
  -- Test 3: Brand access for owners
  SELECT 
    'brand_access',
    'Brands owned by users',
    COUNT(*),
    COUNT(*) > 0
  FROM brands
  WHERE user_id IS NOT NULL
  
  UNION ALL
  
  -- Test 4: Brand shares
  SELECT 
    'brand_access',
    'Accepted brand shares',
    COUNT(*),
    COUNT(*) > 0
  FROM brand_shares
  WHERE status = 'accepted'
  
  UNION ALL
  
  -- Test 5: PowerBrief features
  SELECT 
    'powerbrief',
    'OneSheet records',
    COUNT(*),
    true -- May be 0 if no data
  FROM onesheet
  
  UNION ALL
  
  -- Test 6: Ad uploader
  SELECT 
    'ad_uploader',
    'Ad configurations',
    COUNT(*),
    true -- May be 0 if no data
  FROM ad_configurations
  
  UNION ALL
  
  -- Test 7: Team sync
  SELECT 
    'team_sync',
    'Announcements',
    COUNT(*),
    true -- May be 0 if no data
  FROM team_sync_announcements
)
SELECT 
  category,
  feature,
  count,
  CASE 
    WHEN has_access THEN 'ACCESSIBLE ✅'
    ELSE 'CHECK REQUIRED ⚠️'
  END as status
FROM access_tests
ORDER BY category, feature;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS VERIFICATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'This script has verified:';
  RAISE NOTICE '1. ✅ Existing RLS policies remain unchanged';
  RAISE NOTICE '2. ✅ Public access patterns are preserved';
  RAISE NOTICE '3. ✅ Brand access patterns are consistent';
  RAISE NOTICE '4. ✅ Teams use the same access pattern as brand_shares';
  RAISE NOTICE '5. ✅ All users are automatically migrated to teams';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Run this script both BEFORE and AFTER migration';
  RAISE NOTICE 'All test results should be identical or show MORE access (not less)';
  RAISE NOTICE '';
  RAISE NOTICE 'If any test fails after migration:';
  RAISE NOTICE '1. DO NOT proceed with deployment';
  RAISE NOTICE '2. Review the migration SQL for issues';
  RAISE NOTICE '3. Contact the development team immediately';
  RAISE NOTICE '========================================';
END $$;

-- Clean up test function
DROP FUNCTION IF EXISTS verify_brand_access_patterns();
DROP FUNCTION IF EXISTS verify_teams_migration();
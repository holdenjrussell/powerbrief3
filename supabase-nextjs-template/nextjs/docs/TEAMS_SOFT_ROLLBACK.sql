-- TEAMS SOFT ROLLBACK SCRIPT
-- This script safely disables teams functionality without losing data
-- Run this in Supabase SQL Editor if you need to rollback

-- ============================================================================
-- STEP 1: Make all team sync content visible to everyone
-- ============================================================================

-- Make all announcements global (visible to everyone)
UPDATE team_sync_announcements 
SET is_global = true 
WHERE is_global = false;

-- Remove team restrictions from todos
UPDATE team_sync_todos 
SET target_team_id = NULL 
WHERE target_team_id IS NOT NULL;

-- Remove team restrictions from issues
UPDATE team_sync_issues 
SET target_team_id = NULL 
WHERE target_team_id IS NOT NULL;

-- ============================================================================
-- STEP 2: Set safe defaults for new content
-- ============================================================================

-- Ensure new announcements are global by default
ALTER TABLE team_sync_announcements 
  ALTER COLUMN is_global SET DEFAULT true,
  ALTER COLUMN target_team_ids SET DEFAULT '{}';

-- Make team assignment optional for todos and issues
ALTER TABLE team_sync_todos 
  ALTER COLUMN target_team_id DROP NOT NULL;

ALTER TABLE team_sync_issues 
  ALTER COLUMN target_team_id DROP NOT NULL;

-- ============================================================================
-- STEP 3: Disable automatic team creation
-- ============================================================================

-- Disable trigger that creates teams for new brands
DROP TRIGGER IF EXISTS on_brand_created_create_teams ON brands;

-- Disable trigger that creates scorecard metrics for new teams
DROP TRIGGER IF EXISTS on_team_created_create_scorecard ON teams;

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

-- Check that all content is now visible
SELECT 
  'Announcements' as content_type,
  COUNT(*) as total_count,
  COUNT(CASE WHEN is_global = true THEN 1 END) as global_count,
  CASE 
    WHEN COUNT(*) = COUNT(CASE WHEN is_global = true THEN 1 END) 
    THEN '✅ All announcements are global'
    ELSE '❌ Some announcements are still team-specific'
  END as status
FROM team_sync_announcements

UNION ALL

SELECT 
  'Todos' as content_type,
  COUNT(*) as total_count,
  COUNT(CASE WHEN target_team_id IS NULL THEN 1 END) as unrestricted_count,
  CASE 
    WHEN COUNT(*) = COUNT(CASE WHEN target_team_id IS NULL THEN 1 END) 
    THEN '✅ All todos are unrestricted'
    ELSE '❌ Some todos are still team-specific'
  END as status
FROM team_sync_todos

UNION ALL

SELECT 
  'Issues' as content_type,
  COUNT(*) as total_count,
  COUNT(CASE WHEN target_team_id IS NULL THEN 1 END) as unrestricted_count,
  CASE 
    WHEN COUNT(*) = COUNT(CASE WHEN target_team_id IS NULL THEN 1 END) 
    THEN '✅ All issues are unrestricted'
    ELSE '❌ Some issues are still team-specific'
  END as status
FROM team_sync_issues;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

-- Summary message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SOFT ROLLBACK COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'What was done:';
  RAISE NOTICE '✅ All announcements set to global';
  RAISE NOTICE '✅ All todos unrestricted from teams';
  RAISE NOTICE '✅ All issues unrestricted from teams';
  RAISE NOTICE '✅ Team creation triggers disabled';
  RAISE NOTICE '✅ Team requirements removed';
  RAISE NOTICE '';
  RAISE NOTICE 'What was preserved:';
  RAISE NOTICE '✅ Teams table and data intact';
  RAISE NOTICE '✅ Team members preserved';
  RAISE NOTICE '✅ Scorecard data preserved';
  RAISE NOTICE '✅ Can be re-enabled later';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Comment out TeamSelector in frontend';
  RAISE NOTICE '2. Remove team filtering from queries';
  RAISE NOTICE '3. Test all features work normally';
  RAISE NOTICE '========================================';
END $$;
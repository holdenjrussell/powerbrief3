-- RLS Verification Tests for Teams Migration
-- Run these tests BEFORE and AFTER migration to ensure no access is broken

-- Test Setup: Create test users and brands
DO $$
DECLARE
  v_owner_id UUID := gen_random_uuid();
  v_shared_user_id UUID := gen_random_uuid();
  v_public_user_id UUID := gen_random_uuid();
  v_brand_id UUID;
  v_batch_id UUID;
  v_concept_id UUID;
  v_ugc_creator_id UUID;
  v_ugc_script_id UUID;
BEGIN
  -- Create test brand
  INSERT INTO brands (id, user_id, name) 
  VALUES (gen_random_uuid(), v_owner_id, 'Test Brand')
  RETURNING id INTO v_brand_id;
  
  -- Create brand share
  INSERT INTO brand_shares (brand_id, shared_with_user_id, role, status)
  VALUES (v_brand_id, v_shared_user_id, 'editor', 'accepted');
  
  -- Create public batch
  INSERT INTO brief_batches (id, brand_id, user_id, name, public_share_id)
  VALUES (gen_random_uuid(), v_brand_id, v_owner_id, 'Public Batch', 'test-public-share-id')
  RETURNING id INTO v_batch_id;
  
  -- Create concept in public batch
  INSERT INTO brief_concepts (batch_id, brand_id, user_id, name)
  VALUES (v_batch_id, v_brand_id, v_owner_id, 'Test Concept')
  RETURNING id INTO v_concept_id;
  
  -- Create UGC creator
  INSERT INTO ugc_creators (id, brand_id, user_id, name, email)
  VALUES (gen_random_uuid(), v_brand_id, v_owner_id, 'Test Creator', 'test@example.com')
  RETURNING id INTO v_ugc_creator_id;
  
  -- Create UGC script with public share
  INSERT INTO ugc_creator_scripts (id, brand_id, user_id, creator_id, name, public_share_id)
  VALUES (gen_random_uuid(), v_brand_id, v_owner_id, v_ugc_creator_id, 'Test Script', 'test-script-share')
  RETURNING id INTO v_ugc_script_id;
  
  -- Store test data for verification
  RAISE NOTICE 'Test Data Created:';
  RAISE NOTICE 'Owner ID: %', v_owner_id;
  RAISE NOTICE 'Shared User ID: %', v_shared_user_id;
  RAISE NOTICE 'Brand ID: %', v_brand_id;
  RAISE NOTICE 'Batch ID (public): %', v_batch_id;
  RAISE NOTICE 'UGC Script ID (public): %', v_ugc_script_id;
END $$;

-- Test 1: Verify brand owner access
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub = 'owner-user-id'; -- Replace with actual owner ID from above

-- Should return 1 row
SELECT COUNT(*) as owner_can_see_brand FROM brands WHERE id = 'brand-id';

-- Should return 1 row
SELECT COUNT(*) as owner_can_see_batch FROM brief_batches WHERE id = 'batch-id';

-- Should return 1 row
SELECT COUNT(*) as owner_can_see_ugc_creator FROM ugc_creators WHERE id = 'ugc-creator-id';

-- Test 2: Verify shared user access
SET LOCAL request.jwt.claims.sub = 'shared-user-id'; -- Replace with actual shared user ID

-- Should return 1 row
SELECT COUNT(*) as shared_user_can_see_brand FROM brands WHERE id = 'brand-id';

-- Should return 1 row
SELECT COUNT(*) as shared_user_can_see_batch FROM brief_batches WHERE id = 'batch-id';

-- Should return 1 row
SELECT COUNT(*) as shared_user_can_see_ugc_creator FROM ugc_creators WHERE id = 'ugc-creator-id';

-- Test 3: Verify public access (no auth)
RESET ROLE;

-- Should return 0 rows (no public access to brands directly)
SELECT COUNT(*) as public_cannot_see_brands FROM brands WHERE id = 'brand-id';

-- Should return 1 row (public batch)
SELECT COUNT(*) as public_can_see_public_batch FROM brief_batches WHERE public_share_id = 'test-public-share-id';

-- Should return 1 row (public script)
SELECT COUNT(*) as public_can_see_public_script FROM ugc_creator_scripts WHERE public_share_id = 'test-script-share';

-- Test 4: Verify PowerBrief features access
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub = 'owner-user-id';

-- OneSheet access
SELECT COUNT(*) as can_see_onesheet FROM onesheet WHERE brand_id = 'brand-id';

-- Products access
SELECT COUNT(*) as can_see_products FROM products WHERE brand_id = 'brand-id';

-- Test 5: Verify Ad Uploader access
-- Ad configurations
SELECT COUNT(*) as can_see_ad_configs FROM ad_configurations WHERE brand_id = 'brand-id';

-- Ad batches
SELECT COUNT(*) as can_see_ad_batches FROM ad_batches WHERE brand_id = 'brand-id';

-- Ad drafts
SELECT COUNT(*) as can_see_ad_drafts FROM ad_drafts WHERE brand_id = 'brand-id';

-- Test 6: Verify Team Sync access
-- Announcements
SELECT COUNT(*) as can_see_announcements FROM team_sync_announcements WHERE brand_id = 'brand-id';

-- Todos
SELECT COUNT(*) as can_see_todos FROM team_sync_todos WHERE brand_id = 'brand-id';

-- Issues
SELECT COUNT(*) as can_see_issues FROM team_sync_issues WHERE brand_id = 'brand-id';

-- Test 7: Critical RLS Policy Checks
-- These queries verify the core access patterns remain intact

-- Brand access check (owner and shared users)
WITH access_check AS (
  SELECT 
    b.id,
    b.name,
    CASE 
      WHEN b.user_id = auth.uid() THEN 'owner'
      WHEN bs.shared_with_user_id = auth.uid() AND bs.status = 'accepted' THEN 'shared'
      ELSE 'no_access'
    END as access_type
  FROM brands b
  LEFT JOIN brand_shares bs ON b.id = bs.brand_id
  WHERE b.id = 'brand-id'
)
SELECT * FROM access_check WHERE access_type != 'no_access';

-- Public content access check
WITH public_content AS (
  -- Public batches
  SELECT 'batch' as type, id, name, public_share_id 
  FROM brief_batches 
  WHERE public_share_id IS NOT NULL
  
  UNION ALL
  
  -- Public UGC scripts
  SELECT 'ugc_script' as type, id, name, public_share_id
  FROM ugc_creator_scripts
  WHERE public_share_id IS NOT NULL
)
SELECT * FROM public_content;

-- Test 8: Verify new teams policies don't break existing access
-- After migration, these should still work:

-- Teams should be created for existing brands
SELECT b.id as brand_id, b.name as brand_name, t.id as team_id, t.name as team_name
FROM brands b
LEFT JOIN teams t ON b.id = t.brand_id
WHERE t.is_default = true;

-- Existing brand shares should have team access
SELECT 
  bs.brand_id,
  bs.shared_with_user_id,
  tm.team_id,
  t.name as team_name
FROM brand_shares bs
LEFT JOIN teams t ON t.brand_id = bs.brand_id AND t.is_default = true
LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = bs.shared_with_user_id
WHERE bs.status = 'accepted';

-- Summary Report
DO $$
BEGIN
  RAISE NOTICE '=== RLS VERIFICATION SUMMARY ===';
  RAISE NOTICE '1. Brand Owner Access: Check owner can access all resources';
  RAISE NOTICE '2. Shared User Access: Check shared users maintain access';
  RAISE NOTICE '3. Public Access: Check public shares still work without auth';
  RAISE NOTICE '4. PowerBrief Features: Check OneSheet, Products access';
  RAISE NOTICE '5. Ad Uploader: Check ad configurations, batches, drafts access';
  RAISE NOTICE '6. Team Sync: Check announcements, todos, issues access';
  RAISE NOTICE '7. Teams Integration: Check teams created and members added correctly';
  RAISE NOTICE '';
  RAISE NOTICE 'Run these tests before and after migration.';
  RAISE NOTICE 'All counts should remain the same or increase (for new team data).';
END $$;
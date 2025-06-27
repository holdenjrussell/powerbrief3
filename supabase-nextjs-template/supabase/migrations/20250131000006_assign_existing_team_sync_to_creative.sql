-- Migration: Assign existing team sync items to Creative Team
-- Date: 2025-01-31
-- Description: Ensure all existing team sync items are visible to the Creative Team

-- First, ensure Creative Team exists for all brands
DO $$
DECLARE
  r RECORD;
  v_creative_team_id UUID;
BEGIN
  -- For each brand, ensure Creative Team exists
  FOR r IN SELECT id FROM brands LOOP
    -- Check if Creative Team exists
    SELECT id INTO v_creative_team_id
    FROM teams 
    WHERE brand_id = r.id AND name = 'Creative Team' AND is_default = true;
    
    -- If not, create it
    IF v_creative_team_id IS NULL THEN
      INSERT INTO teams (brand_id, name, is_default) 
      VALUES (r.id, 'Creative Team', true)
      RETURNING id INTO v_creative_team_id;
      
      -- Set default feature access
      WITH features AS (
        SELECT unnest(ARRAY[
          'powerbrief_onesheet',
          'powerbrief_ads',
          'powerbrief_web_assets',
          'powerbrief_email',
          'powerbrief_sms',
          'powerbrief_organic_social',
          'powerbrief_blog',
          'powerframe',
          'ugc_creator_pipeline',
          'team_sync',
          'asset_reviews',
          'ad_ripper',
          'ad_upload_tool',
          'url_to_markdown'
        ]) AS feature_key
      )
      INSERT INTO team_feature_access (team_id, feature_key, has_access)
      SELECT v_creative_team_id, f.feature_key, true
      FROM features f;
    END IF;
  END LOOP;
END $$;

-- Assign all existing todos to Creative Team if they don't have a target_team_id
UPDATE todos t
SET target_team_id = (
  SELECT teams.id 
  FROM teams 
  WHERE teams.brand_id = t.brand_id 
  AND teams.name = 'Creative Team' 
  AND teams.is_default = true
  LIMIT 1
)
WHERE t.target_team_id IS NULL
AND t.brand_id IS NOT NULL;

-- Assign all existing issues to Creative Team if they don't have a target_team_id
UPDATE issues i
SET target_team_id = (
  SELECT teams.id 
  FROM teams 
  WHERE teams.brand_id = i.brand_id 
  AND teams.name = 'Creative Team' 
  AND teams.is_default = true
  LIMIT 1
)
WHERE i.target_team_id IS NULL
AND i.brand_id IS NOT NULL;

-- For announcements, add Creative Team to target_team_ids if empty or null
UPDATE announcements a
SET target_team_ids = ARRAY[(
  SELECT teams.id 
  FROM teams 
  WHERE teams.brand_id = a.brand_id 
  AND teams.name = 'Creative Team' 
  AND teams.is_default = true
  LIMIT 1
)]
WHERE (a.target_team_ids IS NULL OR array_length(a.target_team_ids, 1) IS NULL)
AND a.brand_id IS NOT NULL
AND NOT COALESCE(a.is_global, false);

-- Add all brand owners and shared users to Creative Team if not already members
INSERT INTO team_members (team_id, user_id)
SELECT DISTINCT t.id, u.user_id
FROM (
  -- Brand owners
  SELECT b.id as brand_id, b.user_id
  FROM brands b
  UNION
  -- Shared users
  SELECT bs.brand_id, bs.shared_with_user_id as user_id
  FROM brand_shares bs
  WHERE bs.status = 'accepted' AND bs.shared_with_user_id IS NOT NULL
) u
JOIN teams t ON t.brand_id = u.brand_id AND t.name = 'Creative Team' AND t.is_default = true
WHERE u.user_id IS NOT NULL
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Log summary
DO $$
DECLARE
  v_todo_count INTEGER;
  v_issue_count INTEGER;
  v_announcement_count INTEGER;
  v_member_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_todo_count FROM todos WHERE target_team_id IS NOT NULL;
  SELECT COUNT(*) INTO v_issue_count FROM issues WHERE target_team_id IS NOT NULL;
  SELECT COUNT(*) INTO v_announcement_count FROM announcements WHERE array_length(target_team_ids, 1) > 0;
  SELECT COUNT(*) INTO v_member_count FROM team_members;
  
  RAISE NOTICE 'Migration completed: % todos, % issues, % announcements assigned to teams. % team members total.', 
    v_todo_count, v_issue_count, v_announcement_count, v_member_count;
END $$; 
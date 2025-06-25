# Production Migration Plan - Step by Step

## Phase 1: Pre-Migration Safety (DO THIS FIRST)

### Step 1: Document Current State
Run these queries and save the results:

```sql
-- Save current counts
SELECT 
  (SELECT COUNT(*) FROM brands) as brands_count,
  (SELECT COUNT(*) FROM brand_shares) as brand_shares_count,
  (SELECT COUNT(*) FROM brand_shares WHERE status = 'accepted') as accepted_shares_count;

-- Save sample of current structure
SELECT * FROM brand_shares LIMIT 5;
```

### Step 2: Create a Test Migration (Minimal Impact)
Let's test with just the table creation first (no data migration):

```sql
-- TEST MIGRATION - Run this first to verify no errors
BEGIN;

-- Create teams table (test only)
CREATE TABLE IF NOT EXISTS teams_test (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(brand_id, name)
);

-- Test RLS policy
ALTER TABLE teams_test ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_policy"
  ON teams_test FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id FROM brands WHERE user_id = auth.uid()
      UNION
      SELECT brand_id FROM brand_shares WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Test inserting a team for one brand
INSERT INTO teams_test (brand_id, name, is_default)
SELECT id, 'Test Team', true 
FROM brands 
LIMIT 1;

-- Verify the insert worked
SELECT * FROM teams_test;

-- Clean up test
DROP TABLE teams_test CASCADE;

ROLLBACK;  -- This ensures nothing is committed
```

If this test passes without errors, proceed to Step 3.

## Phase 2: Safe Production Migration

### Step 3: Run Minimal Migration (Tables Only)
First, let's just create the tables without any data migration:

```sql
-- MINIMAL MIGRATION - Tables only (no data changes)
BEGIN;

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(brand_id, name)
);

-- Create team members junction table
CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, user_id)
);

-- Create team feature access table
CREATE TABLE IF NOT EXISTS team_feature_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  has_access BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, feature_key)
);

-- Add new columns to existing tables (safe operations)
ALTER TABLE brand_shares 
ADD COLUMN IF NOT EXISTS team_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Enable RLS (safe operation)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_feature_access ENABLE ROW LEVEL SECURITY;

COMMIT;
```

### Step 4: Verify Tables Created Successfully
```sql
-- Verify tables exist
SELECT tablename FROM pg_tables WHERE tablename IN ('teams', 'team_members', 'team_feature_access');

-- Verify columns were added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'brand_shares' 
AND column_name IN ('team_ids', 'first_name', 'last_name');
```

### Step 5: Add RLS Policies (Safe)
```sql
-- Add RLS policies (safe - they don't restrict existing access)
CREATE POLICY "Users can view teams they belong to"
  ON teams FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id FROM brands WHERE user_id = auth.uid()
      UNION
      SELECT brand_id FROM brand_shares WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Brand owners can manage teams"
  ON teams FOR ALL
  USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- Team members policies
CREATE POLICY "Users can view team members"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT t.id FROM teams t
      WHERE t.brand_id IN (
        SELECT brand_id FROM brands WHERE user_id = auth.uid()
        UNION
        SELECT brand_id FROM brand_shares WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

CREATE POLICY "Brand owners can manage team members"
  ON team_members FOR ALL
  USING (
    team_id IN (
      SELECT t.id FROM teams t
      JOIN brands b ON t.brand_id = b.id
      WHERE b.user_id = auth.uid()
    )
  );

-- Team feature access policies
CREATE POLICY "Users can view feature access"
  ON team_feature_access FOR SELECT
  USING (
    team_id IN (
      SELECT t.id FROM teams t
      WHERE t.brand_id IN (
        SELECT brand_id FROM brands WHERE user_id = auth.uid()
        UNION
        SELECT brand_id FROM brand_shares WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

CREATE POLICY "Brand owners can manage feature access"
  ON team_feature_access FOR ALL
  USING (
    team_id IN (
      SELECT t.id FROM teams t
      JOIN brands b ON t.brand_id = b.id
      WHERE b.user_id = auth.uid()
    )
  );
```

### Step 6: Test Access (Critical)
Before proceeding, test that existing access still works:

```sql
-- Test 1: Verify you can still see your brands
SELECT id, name FROM brands WHERE user_id = auth.uid();

-- Test 2: Verify shared brands still work
SELECT b.id, b.name 
FROM brands b
JOIN brand_shares bs ON b.id = bs.brand_id
WHERE bs.shared_with_user_id = auth.uid() AND bs.status = 'accepted';
```

**STOP HERE if any tests fail. Contact support before proceeding.**

## Phase 3: Data Migration (The Critical Part)

### Step 7: Create Helper Functions
```sql
-- Create function to initialize default teams for a brand
CREATE OR REPLACE FUNCTION create_default_teams_for_brand(p_brand_id UUID)
RETURNS void AS $$
DECLARE
  v_creative_team_id UUID;
  v_marketing_team_id UUID;
  v_cro_team_id UUID;
BEGIN
  -- Create default teams
  INSERT INTO teams (brand_id, name, is_default) 
  VALUES (p_brand_id, 'Creative Team', true)
  RETURNING id INTO v_creative_team_id;
  
  INSERT INTO teams (brand_id, name, is_default) 
  VALUES (p_brand_id, 'Marketing Team', false)
  RETURNING id INTO v_marketing_team_id;
  
  INSERT INTO teams (brand_id, name, is_default) 
  VALUES (p_brand_id, 'CRO', false)
  RETURNING id INTO v_cro_team_id;
  
  -- Set default feature access for all teams
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
  SELECT t.id, f.feature_key, true
  FROM teams t
  CROSS JOIN features f
  WHERE t.brand_id = p_brand_id;
END;
$$ LANGUAGE plpgsql;
```

### Step 8: Test Function with One Brand
```sql
-- Test with just one brand first
BEGIN;

-- Pick one brand to test with
SELECT id, name FROM brands LIMIT 1;

-- Use the brand ID from above query
PERFORM create_default_teams_for_brand('YOUR_BRAND_ID_HERE');

-- Verify it worked
SELECT t.name, t.is_default, COUNT(tfa.id) as feature_count
FROM teams t
LEFT JOIN team_feature_access tfa ON t.id = tfa.team_id
WHERE t.brand_id = 'YOUR_BRAND_ID_HERE'
GROUP BY t.id, t.name, t.is_default;

ROLLBACK;  -- Don't commit yet, just testing
```

If this test works, proceed to Step 9.

### Step 9: Migrate All Brands (Carefully)
```sql
-- Migrate all brands (point of no return - be sure!)
DO $$
DECLARE
  r RECORD;
  brand_count INTEGER;
  processed_count INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO brand_count FROM brands;
  
  RAISE NOTICE 'Starting migration for % brands', brand_count;
  
  FOR r IN SELECT id, name FROM brands ORDER BY created_at LOOP
    BEGIN
      PERFORM create_default_teams_for_brand(r.id);
      processed_count := processed_count + 1;
      
      -- Log progress every 10 brands
      IF processed_count % 10 = 0 THEN
        RAISE NOTICE 'Processed %/% brands', processed_count, brand_count;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create teams for brand % (%): %', r.name, r.id, SQLERRM;
        -- Continue with other brands even if one fails
    END;
  END LOOP;
  
  RAISE NOTICE 'Migration completed. Processed %/% brands', processed_count, brand_count;
END $$;
```

### Step 10: Add Users to Teams
```sql
-- Add all existing brand share users to the Creative Team
INSERT INTO team_members (team_id, user_id)
SELECT DISTINCT t.id, bs.shared_with_user_id
FROM brand_shares bs
JOIN teams t ON t.brand_id = bs.brand_id AND t.name = 'Creative Team' AND t.is_default = true
WHERE bs.status = 'accepted'
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Also add brand owners to their Creative Team
INSERT INTO team_members (team_id, user_id)
SELECT DISTINCT t.id, b.user_id
FROM brands b
JOIN teams t ON t.brand_id = b.id AND t.name = 'Creative Team' AND t.is_default = true
ON CONFLICT (team_id, user_id) DO NOTHING;
```

### Step 11: Verification Queries
```sql
-- Verify migration success
SELECT 
  COUNT(DISTINCT b.id) as brands_count,
  COUNT(DISTINCT t.id) as teams_count,
  COUNT(DISTINCT tm.user_id) as users_in_teams,
  COUNT(DISTINCT tfa.id) as feature_access_records
FROM brands b
LEFT JOIN teams t ON b.id = t.brand_id
LEFT JOIN team_members tm ON t.id = tm.team_id
LEFT JOIN team_feature_access tfa ON t.id = tfa.team_id;

-- Check for any missing data
SELECT 
  'Brands without teams' as issue,
  COUNT(*) as count
FROM brands b
LEFT JOIN teams t ON b.id = t.brand_id
WHERE t.id IS NULL

UNION ALL

SELECT 
  'Brand owners not in Creative Team' as issue,
  COUNT(*) as count
FROM brands b
JOIN teams t ON b.id = t.brand_id AND t.is_default = true
LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.user_id = b.user_id
WHERE tm.user_id IS NULL

UNION ALL

SELECT 
  'Shared users not in Creative Team' as issue,
  COUNT(*) as count
FROM brand_shares bs
JOIN teams t ON bs.brand_id = t.brand_id AND t.is_default = true
LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.user_id = bs.shared_with_user_id
WHERE bs.status = 'accepted' AND tm.user_id IS NULL;
```

## Phase 4: Frontend Integration

### Step 12: Add Future Brand Triggers (Safe)
```sql
-- Add trigger for future brands
CREATE OR REPLACE FUNCTION handle_new_brand_teams()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_teams_for_brand(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_brand_created_create_teams
  AFTER INSERT ON brands
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_brand_teams();
```

### Step 13: Regenerate Types
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/types/supabase.ts
```

### Step 14: Deploy Frontend
Deploy the frontend changes (TeamSelector will now work).

## Emergency Rollback Plan

If something goes critically wrong:

### Quick Disable (Non-destructive)
```typescript
// In AppLayout.tsx, comment out:
// import TeamSelector from './teams/TeamSelector';
// <TeamSelector />
```

### Database Rollback (Destructive - Last Resort)
```sql
-- Only if absolutely necessary
DROP TRIGGER IF EXISTS on_brand_created_create_teams ON brands;
DROP FUNCTION IF EXISTS handle_new_brand_teams();
DROP FUNCTION IF EXISTS create_default_teams_for_brand(UUID);

DROP TABLE IF EXISTS team_feature_access CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;  
DROP TABLE IF EXISTS teams CASCADE;

ALTER TABLE brand_shares 
DROP COLUMN IF EXISTS team_ids,
DROP COLUMN IF EXISTS first_name,
DROP COLUMN IF EXISTS last_name;
```

## Success Checklist

After migration, verify:
- [ ] All users can still see their brands
- [ ] Brand sharing still works
- [ ] Team selector appears and works
- [ ] No 403 errors in browser console
- [ ] All API endpoints return 200 status
- [ ] Team sync page still loads

## Monitoring

Watch these for 24 hours after migration:
- Supabase logs for auth errors
- Application error rates
- User access complaints
- Team selector usage analytics
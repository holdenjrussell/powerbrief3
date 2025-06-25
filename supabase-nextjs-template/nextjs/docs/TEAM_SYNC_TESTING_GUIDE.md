# Team Sync Testing Guide - Production Safety

## Overview
This guide helps you safely test and implement team sync features on your production Supabase instance without breaking existing functionality.

## Pre-Migration Safety Checks

### 1. Backup Current State
Before making any changes, document your current state:

```sql
-- Count current brands
SELECT COUNT(*) as total_brands FROM brands;

-- Count current brand shares
SELECT COUNT(*) as total_shares FROM brand_shares;

-- Sample current brand shares structure
SELECT id, brand_id, shared_with_user_id, status, created_at 
FROM brand_shares 
LIMIT 5;

-- Check existing team_sync data
SELECT 
  (SELECT COUNT(*) FROM team_sync_announcements) as announcements,
  (SELECT COUNT(*) FROM team_sync_todos) as todos,
  (SELECT COUNT(*) FROM team_sync_issues) as issues;
```

### 2. Test Current Brand Sharing Access
Pick a test user and verify they can:
- See shared brands in the brand selector
- Access PowerBrief for shared brands
- View team sync content for shared brands

Record the brand IDs and user IDs you're testing with.

## Safe Migration Strategy

### Phase 1: Run Migrations with Verification

#### Step 1: Run Teams Infrastructure Migration
```bash
npx supabase db push --include-all
```

#### Step 2: Immediate Verification
Run these queries immediately after migration:

```sql
-- Verify teams were created
SELECT b.name as brand_name, t.name as team_name, t.is_default
FROM brands b
JOIN teams t ON b.id = t.brand_id
ORDER BY b.name, t.name;

-- Verify all brand owners are in Creative Team
SELECT 
  b.name as brand_name,
  b.user_id as owner_id,
  t.name as team_name,
  tm.user_id as member_id
FROM brands b
JOIN teams t ON b.id = t.brand_id AND t.is_default = true
LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.user_id = b.user_id
ORDER BY b.name;

-- Check for any missing team members (should be empty)
SELECT 
  b.name as brand_name,
  b.user_id as owner_id
FROM brands b
JOIN teams t ON b.id = t.brand_id AND t.is_default = true
LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.user_id = b.user_id
WHERE tm.user_id IS NULL;
```

#### Step 3: Verify Brand Sharing Compatibility
```sql
-- Verify all shared users are in Creative Team
SELECT 
  b.name as brand_name,
  bs.shared_with_user_id,
  bs.status,
  t.name as team_name,
  tm.user_id as member_id
FROM brand_shares bs
JOIN brands b ON bs.brand_id = b.id
JOIN teams t ON b.id = t.brand_id AND t.is_default = true
LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.user_id = bs.shared_with_user_id
WHERE bs.status = 'accepted'
ORDER BY b.name, bs.shared_with_user_id;

-- Check for any missing shared user team memberships (should be empty)
SELECT 
  b.name as brand_name,
  bs.shared_with_user_id,
  'Missing team membership' as issue
FROM brand_shares bs
JOIN brands b ON bs.brand_id = b.id
JOIN teams t ON b.id = t.brand_id AND t.is_default = true
LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.user_id = bs.shared_with_user_id
WHERE bs.status = 'accepted' AND tm.user_id IS NULL;
```

## RLS Policy Testing

### Test 1: Brand Owner Access
Use a brand owner account to test:

```sql
-- Test as brand owner (replace YOUR_USER_ID)
SELECT 
  t.name as team_name,
  t.brand_id,
  (SELECT name FROM brands WHERE id = t.brand_id) as brand_name
FROM teams t
WHERE t.brand_id IN (
  SELECT id FROM brands WHERE user_id = 'YOUR_USER_ID'
);
```

### Test 2: Shared User Access
Use a shared user account to test:

```sql
-- Test as shared user (replace YOUR_USER_ID)
SELECT 
  t.name as team_name,
  t.brand_id,
  (SELECT name FROM brands WHERE id = t.brand_id) as brand_name
FROM teams t
WHERE t.brand_id IN (
  SELECT brand_id FROM brand_shares 
  WHERE shared_with_user_id = 'YOUR_USER_ID' AND status = 'accepted'
);
```

### Test 3: Team Members Access
```sql
-- Test team member visibility (replace YOUR_USER_ID)
SELECT 
  tm.team_id,
  tm.user_id,
  t.name as team_name,
  (SELECT name FROM brands WHERE id = t.brand_id) as brand_name
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
WHERE t.brand_id IN (
  SELECT brand_id FROM brands WHERE user_id = 'YOUR_USER_ID'
  UNION
  SELECT brand_id FROM brand_shares WHERE shared_with_user_id = 'YOUR_USER_ID' AND status = 'accepted'
);
```

## API Testing Checklist

### Test 1: Teams API
```bash
# Get teams for a brand
curl -X GET "https://your-app.vercel.app/api/teams?brandId=YOUR_BRAND_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test 2: Team Members API
```bash
# Get team members
curl -X GET "https://your-app.vercel.app/api/teams/TEAM_ID/members" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test 3: Feature Access API
```bash
# Get feature access
curl -X GET "https://your-app.vercel.app/api/teams/TEAM_ID/features" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Frontend Testing Checklist

### Test 1: Brand Selector Compatibility
- [ ] Brand selector still shows all brands
- [ ] Shared brands still appear
- [ ] Brand switching still works
- [ ] Navigation to brand-specific pages works

### Test 2: Team Selector Functionality
- [ ] Team selector appears after brand is selected
- [ ] Shows default team (Creative Team) selected
- [ ] Can switch between teams
- [ ] Team selection persists on page refresh

### Test 3: Existing Functionality Preservation
- [ ] PowerBrief still works for all brands
- [ ] UGC Pipeline access preserved
- [ ] Team Sync tabs still work
- [ ] Brand sharing invitations still work

## Common Issues and Solutions

### Issue 1: Users Not Added to Teams
**Symptoms:** Team selector is empty or users can't see teams

**Check:**
```sql
-- Find users not in any team
SELECT DISTINCT bs.shared_with_user_id
FROM brand_shares bs
WHERE bs.status = 'accepted'
AND bs.shared_with_user_id NOT IN (
  SELECT DISTINCT tm.user_id 
  FROM team_members tm
  JOIN teams t ON tm.team_id = t.id
  WHERE t.brand_id = bs.brand_id
);
```

**Fix:**
```sql
-- Add missing users to Creative Team
INSERT INTO team_members (team_id, user_id)
SELECT DISTINCT t.id, bs.shared_with_user_id
FROM brand_shares bs
JOIN teams t ON bs.brand_id = t.brand_id AND t.is_default = true
WHERE bs.status = 'accepted'
AND bs.shared_with_user_id NOT IN (
  SELECT tm.user_id 
  FROM team_members tm 
  WHERE tm.team_id = t.id
)
ON CONFLICT (team_id, user_id) DO NOTHING;
```

### Issue 2: RLS Policy Too Restrictive
**Symptoms:** Users lose access to brands/teams they should see

**Check current user's access:**
```sql
-- Check what user can see (run as specific user)
SELECT 
  'brands' as type,
  b.name,
  'owner' as access_type
FROM brands b 
WHERE b.user_id = auth.uid()
UNION ALL
SELECT 
  'brands' as type,
  b.name,
  'shared' as access_type
FROM brands b
JOIN brand_shares bs ON b.id = bs.brand_id
WHERE bs.shared_with_user_id = auth.uid() AND bs.status = 'accepted';
```

### Issue 3: Feature Access Not Working
**Check feature access setup:**
```sql
-- Verify feature access records exist
SELECT t.name, tfa.feature_key, tfa.has_access
FROM teams t
LEFT JOIN team_feature_access tfa ON t.id = tfa.team_id
WHERE t.brand_id = 'YOUR_BRAND_ID'
ORDER BY t.name, tfa.feature_key;
```

## Rollback Plan

If something goes wrong, here's the rollback strategy:

### 1. Disable New Features (Quick Fix)
Comment out the TeamSelector import in AppLayout.tsx:
```typescript
// import TeamSelector from './teams/TeamSelector';
```

### 2. Database Rollback (If Needed)
```sql
-- Remove new columns (only if absolutely necessary)
ALTER TABLE brand_shares 
DROP COLUMN IF EXISTS team_ids,
DROP COLUMN IF EXISTS first_name,
DROP COLUMN IF EXISTS last_name;

ALTER TABLE team_sync_announcements
DROP COLUMN IF EXISTS is_resolved,
DROP COLUMN IF EXISTS is_global,
DROP COLUMN IF EXISTS target_team_ids;

-- Drop new tables (nuclear option)
DROP TABLE IF EXISTS team_feature_access CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS scorecard_data CASCADE;
DROP TABLE IF EXISTS scorecard_metrics CASCADE;
```

## Success Criteria

✅ **Migration Successful If:**
- All existing users can still access their brands
- Brand sharing continues to work
- Team selector appears and shows Creative Team by default
- All API endpoints return 200 status codes
- No users report loss of access

✅ **Ready for Next Phase If:**
- All tests pass
- No error logs in Supabase
- Frontend loads without TypeScript errors
- Team selector works in production

## Post-Migration Monitoring

### Monitor These Logs for 24 Hours:
1. Supabase Auth logs for permission errors
2. API endpoint errors (especially 403 Forbidden)
3. Frontend console errors related to teams
4. User reports of access issues

### Key Metrics to Watch:
- Brand selector usage (should remain same)
- Team sync page visits (should remain same)
- Error rates in team-related endpoints

## Regenerate Types After Migration

After successful migration:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/types/supabase.ts
```

## Testing Script

Save this as a runnable test script:

```sql
-- TEAM_SYNC_PRODUCTION_TESTS.sql
-- Run this after migration to verify everything works

\echo 'Starting Team Sync Production Tests...'

-- Test 1: Verify teams exist for all brands
\echo 'Test 1: Teams per brand'
SELECT 
  COUNT(DISTINCT b.id) as total_brands,
  COUNT(DISTINCT t.id) as total_teams,
  COUNT(DISTINCT CASE WHEN t.is_default THEN t.id END) as default_teams
FROM brands b
LEFT JOIN teams t ON b.id = t.brand_id;

-- Test 2: Verify team memberships
\echo 'Test 2: Team memberships'
SELECT 
  COUNT(DISTINCT tm.user_id) as users_in_teams,
  COUNT(DISTINCT tm.team_id) as teams_with_members
FROM team_members tm;

-- Test 3: Verify feature access
\echo 'Test 3: Feature access setup'
SELECT 
  COUNT(DISTINCT tfa.team_id) as teams_with_features,
  COUNT(*) as total_feature_records
FROM team_feature_access tfa;

-- Test 4: Verify RLS is working
\echo 'Test 4: Row Level Security check'
SELECT 
  't.teams' as table_name,
  pg_get_expr(polqual, polrelid) as policy_expression
FROM pg_policy 
WHERE polrelid = 'teams'::regclass;

\echo 'All tests completed. Review results above.'
```

Run this script in your Supabase SQL editor after migration to verify everything is working correctly.
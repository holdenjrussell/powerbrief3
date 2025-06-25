# 🚨 EMERGENCY ROLLBACK GUIDE - Teams Migration

## ⚠️ CRITICAL: DO NOT CREATE MIGRATION FILES FOR ROLLBACK

**All SQL commands in this guide should be run manually in Supabase SQL Editor.**
**DO NOT create `.sql` files in the migrations folder - they will be automatically applied!**

## Quick Actions (Do These First!)

### 1. IMMEDIATE FRONTEND DISABLE (< 1 minute)
```typescript
// In src/components/AppLayout.tsx
// Comment out line ~85:
// <TeamSelector />

// In src/lib/context/BrandContext.tsx
// Comment out lines ~18-19:
// selectedTeam: null,
// setSelectedTeam: () => {},
```

### 2. DISABLE TEAM FILTERING (< 2 minutes)
If team filtering is causing issues in Team Sync:

```typescript
// In src/components/team-sync/AnnouncementsTab.tsx
// Comment out line ~39:
// .eq('is_global', true)

// And comment out the team filter around line ~43:
// if (selectedTeam) {
//   query = query.contains('target_team_ids', [selectedTeam.id]);
// }

// In src/components/team-sync/TodosTab.tsx
// Comment out team filtering around line ~51:
// if (selectedTeam) {
//   query = query.eq('target_team_id', selectedTeam.id);
// }

// In src/components/team-sync/IssuesTab.tsx
// Comment out team filtering around line ~42:
// if (selectedTeam) {
//   query = query.eq('target_team_id', selectedTeam.id);
// }
```

## Full Database Rollback

### Option A: Soft Rollback (Recommended - Non-Destructive)

This keeps the tables but disables their usage:

**⚠️ IMPORTANT: Copy and paste this SQL into Supabase SQL Editor manually. DO NOT create a migration file!**

```sql
-- SOFT ROLLBACK SCRIPT
-- This disables teams without losing data
-- MANUALLY RUN THIS IN SUPABASE SQL EDITOR

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

-- Summary
SELECT 'SOFT ROLLBACK COMPLETE - Teams disabled but data preserved' as status;
```

**Teams tables remain but are effectively disabled**

### Option B: Hard Rollback (Destructive - Last Resort)

⚠️ **WARNING**: This will DELETE all team data permanently!

**⚠️ IMPORTANT: Copy and paste this SQL into Supabase SQL Editor manually. DO NOT create a migration file!**

```sql
-- HARD ROLLBACK SCRIPT
-- Only use if absolutely necessary - this DELETES data!
-- MANUALLY RUN THIS IN SUPABASE SQL EDITOR

-- 1. Drop foreign key constraints first
ALTER TABLE team_sync_todos DROP CONSTRAINT IF EXISTS team_sync_todos_target_team_id_fkey;
ALTER TABLE team_sync_issues DROP CONSTRAINT IF EXISTS team_sync_issues_target_team_id_fkey;
ALTER TABLE team_sync_issues DROP CONSTRAINT IF EXISTS team_sync_issues_source_metric_id_fkey;

-- 2. Remove columns from existing tables
ALTER TABLE brand_shares 
  DROP COLUMN IF EXISTS team_ids,
  DROP COLUMN IF EXISTS first_name,
  DROP COLUMN IF EXISTS last_name;

ALTER TABLE team_sync_announcements
  DROP COLUMN IF EXISTS is_resolved,
  DROP COLUMN IF EXISTS is_global,
  DROP COLUMN IF EXISTS target_team_ids;

ALTER TABLE team_sync_todos
  DROP COLUMN IF EXISTS target_team_id;

ALTER TABLE team_sync_issues
  DROP COLUMN IF EXISTS target_team_id,
  DROP COLUMN IF EXISTS source_metric_id,
  DROP COLUMN IF EXISTS metric_context;

-- 3. Drop functions and triggers
DROP TRIGGER IF EXISTS on_brand_created_create_teams ON brands;
DROP TRIGGER IF EXISTS on_team_created_create_scorecard ON teams;
DROP FUNCTION IF EXISTS handle_new_brand_teams();
DROP FUNCTION IF EXISTS handle_new_team_scorecard();
DROP FUNCTION IF EXISTS create_default_teams_for_brand(UUID);
DROP FUNCTION IF EXISTS create_default_scorecard_metrics(UUID, UUID);

-- 4. Drop scorecard tables
DROP TABLE IF EXISTS scorecard_data CASCADE;
DROP TABLE IF EXISTS scorecard_metrics CASCADE;

-- 5. Drop team tables
DROP TABLE IF EXISTS team_feature_access CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- 6. Verify rollback
SELECT 'Rollback complete. Teams and scorecard features have been removed.' as status;
```

## API Rollback

### 1. Disable Team Endpoints
Add to the top of each team API file to disable:

```typescript
// In api/teams/route.ts
export async function GET() {
  return NextResponse.json({ error: 'Teams feature disabled' }, { status: 503 });
}
export async function POST() {
  return NextResponse.json({ error: 'Teams feature disabled' }, { status: 503 });
}

// Repeat for all team endpoints
```

### 2. Or Remove Team API Files (Nuclear Option)
```bash
# Remove all team-related API endpoints
rm -rf src/app/api/teams/
rm -rf src/app/api/scorecard/
```

## Component Rollback

### 1. Disable Team Management in Brand Config
```typescript
// In src/app/app/powerbrief/[brandId]/page.tsx
// Comment out around line ~396:
// <TeamManagement brandId={brand.id} />
```

### 2. Disable Scorecard Tab
```typescript
// In src/components/team-sync/TeamSyncTabs.tsx
// Comment out the Scorecard tab around line ~31:
// {
//   id: 'scorecard',
//   label: 'Scorecard',
//   icon: <ChartBar className="w-4 h-4" />,
//   component: <ScorecardTab />
// },
```

## Verification Steps

After rollback, verify:

### 1. Check Basic Access
```sql
-- Verify users can still access brands
SELECT COUNT(*) FROM brands WHERE user_id = auth.uid();

-- Verify brand shares still work
SELECT COUNT(*) FROM brand_shares WHERE status = 'accepted';

-- Verify public access still works
SELECT COUNT(*) FROM brief_batches WHERE public_share_id IS NOT NULL;
```

### 2. Test Critical Features
- [ ] PowerBrief access works
- [ ] UGC Creator Pipeline works
- [ ] Ad Uploader works
- [ ] Public batch shares work
- [ ] Team Sync shows all data (no filtering)

### 3. Monitor for Errors
```bash
# Check Vercel logs
vercel logs --follow

# Check Supabase logs
supabase logs --follow
```

## Recovery Timeline

| Action | Time | Impact |
|--------|------|--------|
| Frontend Disable | < 1 min | Teams UI hidden |
| Disable Filtering | < 2 min | All data visible |
| Soft DB Rollback | < 5 min | Teams disabled, data preserved |
| Hard DB Rollback | < 10 min | Teams removed completely |
| Full Code Rollback | < 15 min | Complete feature removal |

## Post-Rollback Actions

1. **Notify Team**: Alert development team of rollback
2. **Document Issues**: Record what caused the need for rollback
3. **User Communication**: If needed, notify affected users
4. **Plan Fix**: Schedule time to address issues before re-deployment

## Rollback Verification Checklist

- [ ] TeamSelector removed from UI
- [ ] Team filtering disabled in Team Sync
- [ ] All announcements visible to all users
- [ ] All todos visible to team members
- [ ] All issues visible to team members
- [ ] Brand access unchanged
- [ ] Public shares still work
- [ ] No TypeScript errors in console
- [ ] No 500 errors in API calls
- [ ] Users report normal access

## Emergency Contacts

If rollback fails or causes additional issues:
1. Check Supabase status: https://status.supabase.com/
2. Review Vercel logs for API errors
3. Check browser console for frontend errors
4. Test with a clean browser/incognito mode

## Notes

- The SOFT rollback is preferred as it preserves data
- The HARD rollback should only be used if soft rollback fails
- Frontend-only rollback is often sufficient for most issues
- Always verify access patterns after rollback
- Keep this guide handy during deployment

---

**Remember**: The teams migration is designed to be non-breaking. If you need to rollback, it's likely due to an edge case that can be fixed without full removal.
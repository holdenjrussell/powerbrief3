# Teams Migration Final Checklist

## ✅ Migration Files Corrected

### 1. **Table Name Corrections**
- ❌ ~~`team_sync_announcements`~~ → ✅ `announcements`
- ❌ ~~`team_sync_todos`~~ → ✅ `todos`
- ❌ ~~`team_sync_issues`~~ → ✅ `issues`

### 2. **Files Updated**
- ✅ `20250131000002_add_teams_infrastructure.sql` - Fixed table names
- ✅ `20250131000003_add_scorecard_tables.sql` - Fixed table names
- ✅ All rollback documentation updated with correct table names

## 📋 Pre-Migration Verification

Run this SQL in Supabase to verify everything is ready:

```sql
-- Quick verification
SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ Ready'
    ELSE '❌ Missing'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('announcements', 'todos', 'issues', 'brands', 'brand_shares')
ORDER BY table_name;
```

## 🚀 Migration Steps

### 1. Run Pre-Flight Check
```sql
-- Copy and run TEAMS_MIGRATION_VERIFICATION.sql in Supabase SQL Editor
```

### 2. Apply Migrations
```bash
cd supabase-nextjs-template/nextjs
npx supabase db push --include-all
```

### 3. Verify Migration Success
```sql
-- Check teams were created
SELECT COUNT(*) as team_count FROM teams;

-- Check team members were added
SELECT COUNT(*) as member_count FROM team_members;

-- Check new columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'announcements' 
  AND column_name IN ('is_resolved', 'is_global', 'target_team_ids');
```

## 🔍 What the Migration Does

### Creates New Tables:
- `teams` - Team definitions
- `team_members` - User-team associations
- `team_feature_access` - Feature permissions
- `scorecard_metrics` - Metric configurations
- `scorecard_data` - Metric values

### Adds Columns to Existing Tables:
- `announcements` + `is_resolved`, `is_global`, `target_team_ids`
- `todos` + `target_team_id`
- `issues` + `target_team_id`, `source_metric_id`, `metric_context`
- `brand_shares` + `team_ids`, `first_name`, `last_name`

### Automatic Actions:
- Creates 3 default teams for each brand (Creative, Marketing, CRO)
- Adds all existing users to Creative Team
- Enables all features for all teams by default
- Creates default scorecard metrics

## ⚠️ Important Notes

1. **Table Names**: The actual tables are `announcements`, `todos`, and `issues` (NOT prefixed with `team_sync_`)
2. **Dependencies**: Requires `update_updated_at_column()` function (already exists)
3. **RLS Policies**: No existing policies are modified
4. **Rollback**: Use manual SQL in Supabase Editor (never create rollback migration files)

## 🧪 Post-Migration Testing

### Frontend Tests:
- [ ] TeamSelector appears in header
- [ ] Teams load for selected brand
- [ ] Team filtering works in Team Sync tabs
- [ ] Team management works in brand config
- [ ] Scorecard tab displays

### Database Tests:
- [ ] All brands have default teams
- [ ] All users are in Creative Team
- [ ] New columns are populated
- [ ] RLS policies work correctly

## 🚨 If Something Goes Wrong

1. **Quick Fix**: Comment out `<TeamSelector />` in AppLayout.tsx
2. **Database Fix**: Run soft rollback SQL from EMERGENCY_ROLLBACK_GUIDE.md
3. **Full Rollback**: See EMERGENCY_ROLLBACK_GUIDE.md for complete instructions

## ✅ Final Confirmation

Before running migration, confirm:
- [ ] You have database backups
- [ ] You're running against the correct environment
- [ ] You have the rollback guide ready
- [ ] You've notified the team about the migration

The migration is now ready to run with all table references corrected!
# Rollback Procedure Safety Guide

## 🚨 CRITICAL SAFETY RULE

**NEVER create rollback migration files!** 

Migration files in the `supabase/migrations/` directory are automatically applied when you run:
- `supabase db push`
- `supabase db reset`
- `supabase start` (in some cases)

## ✅ CORRECT Rollback Procedure

### 1. Frontend Rollback
- Edit files directly in your code editor
- Comment out problematic components
- Deploy the changes normally

### 2. Database Rollback
- **Copy SQL from the rollback guides**
- **Paste into Supabase SQL Editor manually**
- **Run the SQL directly in the dashboard**

## ❌ INCORRECT Rollback Procedure

### DON'T DO THIS:
```bash
# ❌ WRONG - This creates a migration file
echo "DROP TABLE teams;" > supabase/migrations/rollback_teams.sql

# ❌ WRONG - This will apply the rollback automatically
supabase db push
```

### ✅ DO THIS INSTEAD:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy rollback SQL from guide
4. Paste and run manually

## Why This Matters

### Migration Files Are Permanent
- Once a migration is in the folder, it's part of your schema history
- It will be applied to all environments (dev, staging, prod)
- It cannot be easily undone

### Manual SQL Is Controlled
- You choose when to run it
- You can test it first
- You can run it on specific environments only
- You can verify results before proceeding

## Rollback File Locations

### ✅ Safe Documentation (Use These)
- `docs/EMERGENCY_ROLLBACK_GUIDE.md` - Complete rollback procedures
- `docs/TEAMS_ROLLBACK_QUICK_REFERENCE.md` - Quick actions
- `docs/CRITICAL_RLS_VERIFICATION.sql` - Verification queries

### ❌ Dangerous Locations (Never Put Rollback SQL Here)
- `supabase/migrations/` - Auto-applied migrations
- `supabase/schemas/` - Declarative schema files
- Any `.sql` file in the project root

## Emergency Rollback Steps

### 1. Immediate (< 1 minute)
```typescript
// Comment out in AppLayout.tsx
// <TeamSelector />
```

### 2. Quick Fix (< 2 minutes)
```typescript
// Comment out team filtering in Team Sync components
// See TEAMS_ROLLBACK_QUICK_REFERENCE.md
```

### 3. Database Fix (< 5 minutes)
```sql
-- Copy this into Supabase SQL Editor:
UPDATE announcements SET is_global = true;
UPDATE todos SET target_team_id = NULL;
UPDATE issues SET target_team_id = NULL;
```

## Verification

After rollback:
1. Check that all features work as before
2. Verify no console errors
3. Test public shares still work
4. Confirm all users can access their content

## Re-enabling Teams

If you want to re-enable teams after rollback:
1. Uncomment the frontend components
2. The database tables and data are preserved
3. Teams will work again immediately

## Summary

- **Frontend rollback**: Edit code directly
- **Database rollback**: Manual SQL in dashboard only  
- **Never create rollback migration files**
- **Always verify after rollback**
- **Teams can be re-enabled easily**

This approach ensures you have full control over the rollback process and prevents accidental automatic application of destructive changes.
# Team Sync Migration Checklist

## Quick Reference for Production Migration

### Before You Start
- [ ] Read `PRODUCTION_MIGRATION_PLAN.md` completely
- [ ] Read `TEAM_SYNC_TESTING_GUIDE.md` completely  
- [ ] Have rollback plan ready
- [ ] Backup current state documentation

### Phase 1: Safety Checks ⚠️
- [ ] Document current brand/share counts
- [ ] Test current brand sharing access
- [ ] Run test migration (Step 2 in plan)
- [ ] Verify test passes without errors

### Phase 2: Tables & Structure 🏗️
- [ ] Create tables only (Step 3)
- [ ] Verify tables created (Step 4)
- [ ] Add RLS policies (Step 5)
- [ ] **CRITICAL**: Test existing access still works (Step 6)

**🛑 STOP if Step 6 fails - existing users must retain access**

### Phase 3: Data Migration 📊
- [ ] Create helper functions (Step 7)
- [ ] Test with one brand (Step 8)
- [ ] Migrate all brands (Step 9)
- [ ] Add users to teams (Step 10)
- [ ] Run verification queries (Step 11)

### Phase 4: Frontend 🎨
- [ ] Add future brand triggers (Step 12)
- [ ] Regenerate TypeScript types (Step 13)
- [ ] Deploy frontend changes (Step 14)

### Phase 5: Verification ✅
- [ ] Run post-migration tests from testing guide
- [ ] Verify team selector appears and works
- [ ] Check API endpoints return 200
- [ ] Test with different user accounts
- [ ] Monitor for 24 hours

## Emergency Contacts
If something goes wrong:
1. **Quick fix**: Comment out TeamSelector in AppLayout.tsx
2. **Database rollback**: Use rollback SQL from migration plan
3. **Get help**: Contact your team immediately

## Success Indicators
✅ **You're successful when:**
- All existing users can still access their brands
- Brand sharing continues to work normally
- Team selector appears in header
- No 403 errors in browser console
- No user complaints about lost access

## Warning Signs
🚨 **Stop and rollback if:**
- Users can't see brands they previously had access to
- Brand sharing stops working
- 403 Forbidden errors in console
- API endpoints returning errors
- Users reporting access issues

## Key SQL Queries for Troubleshooting

### Check if user missing teams:
```sql
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

### Fix missing users:
```sql
INSERT INTO team_members (team_id, user_id)
SELECT DISTINCT t.id, bs.shared_with_user_id
FROM brand_shares bs
JOIN teams t ON bs.brand_id = t.brand_id AND t.is_default = true
WHERE bs.status = 'accepted'
ON CONFLICT (team_id, user_id) DO NOTHING;
```

### Verify team counts:
```sql
SELECT 
  COUNT(DISTINCT b.id) as brands,
  COUNT(DISTINCT t.id) as teams,
  COUNT(DISTINCT tm.user_id) as users_in_teams
FROM brands b
LEFT JOIN teams t ON b.id = t.brand_id
LEFT JOIN team_members tm ON t.id = tm.team_id;
```

## Timeline Estimate
- **Phase 1-2**: 30 minutes (testing and table creation)
- **Phase 3**: 15-60 minutes (depends on number of brands)
- **Phase 4-5**: 30 minutes (frontend deploy and verification)
- **Total**: 1-2 hours for careful execution

## Remember
- Take your time with each step
- Verify at each checkpoint  
- Don't skip the safety checks
- Have the rollback plan ready
- Monitor for 24 hours after completion
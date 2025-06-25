# 🚨 TEAMS ROLLBACK - QUICK REFERENCE

## 🔴 IMMEDIATE ACTIONS (Under 1 Minute)

### 1. Hide Team Selector
```typescript
// src/components/AppLayout.tsx (line ~85)
// <TeamSelector />  ← COMMENT THIS OUT
```

### 2. Disable Team Context
```typescript
// src/lib/context/BrandContext.tsx (lines ~18-19)
// selectedTeam: null,          ← COMMENT OUT
// setSelectedTeam: () => {},   ← COMMENT OUT
```

## 🟡 QUICK FIXES (Under 2 Minutes)

### Remove Team Filtering
```typescript
// AnnouncementsTab.tsx (~line 39-43)
// .eq('is_global', true)                              ← COMMENT OUT
// if (selectedTeam) {                                 ← COMMENT OUT
//   query = query.contains('target_team_ids', [...]) ← COMMENT OUT
// }                                                   ← COMMENT OUT

// TodosTab.tsx (~line 51)
// if (selectedTeam) {                          ← COMMENT OUT
//   query = query.eq('target_team_id', ...)    ← COMMENT OUT
// }                                            ← COMMENT OUT

// IssuesTab.tsx (~line 42)
// if (selectedTeam) {                          ← COMMENT OUT
//   query = query.eq('target_team_id', ...)    ← COMMENT OUT
// }                                            ← COMMENT OUT
```

### Hide Team Management
```typescript
// app/powerbrief/[brandId]/page.tsx (~line 396)
// <TeamManagement brandId={brand.id} />  ← COMMENT OUT
```

## 🟢 DATABASE QUICK FIX (Under 5 Minutes)

**⚠️ Copy and paste into Supabase SQL Editor (don't create migration file):**

```sql
-- Make all content visible (run in Supabase SQL Editor)
UPDATE announcements SET is_global = true;
UPDATE todos SET target_team_id = NULL;
UPDATE issues SET target_team_id = NULL;
```

## ✅ VERIFICATION CHECKLIST

After changes:
- [ ] Team selector is hidden
- [ ] All announcements are visible
- [ ] All todos are visible
- [ ] All issues are visible
- [ ] No console errors
- [ ] Users can access brands normally

## 📞 IF STILL BROKEN

1. Check browser console for errors
2. Check Network tab for failing API calls
3. Try incognito/private browsing
4. Clear localStorage: `localStorage.clear()`
5. See full guide: `EMERGENCY_ROLLBACK_GUIDE.md`

---
**Time to Normal: < 2 minutes with frontend changes only**
# AdRipper Fix: Align with PowerBrief Pattern

## Root Cause Identified

After examining how PowerBrief and the ad uploader successfully handle brand filtering, I found that **AdRipper was using a different approach**:

### PowerBrief & Ad Uploader (Working) ✅
- Use `getBrands(user.id)` service function
- Service function explicitly filters: `.eq('user_id', userId)`
- Simple RLS policy: `auth.uid() = user_id`

### AdRipper (Broken) ❌
- Made direct Supabase query without user filtering
- Relied entirely on RLS policies
- Had complex/conflicting RLS policies

## The Fix

### 1. Database Migration: `fix_adripper_to_match_powerbrief_pattern.sql`

This migration:
- Removes complex/conflicting RLS policies
- Creates the exact same simple policies PowerBrief uses
- Ensures all brands have `user_id` set properly
- Uses the same pattern: `auth.uid() = user_id`

### 2. Frontend Update: AdRipper Page

Updated `src/app/app/adripper/page.tsx` to:
- Import and use `getBrands(user.id)` service (same as PowerBrief)
- Remove direct Supabase query
- Add proper user dependency in useEffect

## Key Changes

### Before (Broken):
```typescript
const { data, error } = await supabase
  .from('brands')
  .select('id, name, created_at')
  .order('name'); // No user filtering!
```

### After (Fixed):
```typescript
const brandsData = await getBrands(user.id); // Explicit user filtering
```

## Why This Works

1. **Consistent Pattern**: Now all three tools (PowerBrief, Ad Uploader, AdRipper) use the same approach
2. **Explicit Filtering**: The service function explicitly filters by user_id
3. **Simple RLS**: Uses the proven simple RLS policy that PowerBrief uses
4. **Data Integrity**: Ensures all brands have proper user_id assignments

## Migration Steps

1. Run `fix_adripper_to_match_powerbrief_pattern.sql` in Supabase SQL Editor
2. The frontend changes are already applied
3. Test that brands now load properly in AdRipper

## Expected Result

- AdRipper will now show only the user's own brands (same as PowerBrief)
- Social media content should load properly for accessible brands
- No more "Error loading brands: {}" console errors 
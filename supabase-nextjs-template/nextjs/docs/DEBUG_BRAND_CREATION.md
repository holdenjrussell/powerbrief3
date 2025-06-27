# Debugging Brand Creation Issues

## Problem
New users are unable to create brands in the application.

## Root Cause (FIXED)
The issue was that the `createBrand` function in `powerbriefService.ts` was using a server-side Supabase client (`createSSRClient`) from a client component. This caused authentication context to be lost, resulting in RLS policy violations (403 Forbidden errors).

## Additional Issue (FIXED)
After fixing the initial issue, a second error occurred: "permission denied for function create_default_teams_for_brand". This function is called by a trigger when a new brand is created to set up default teams, but regular users don't have permission to execute it.

## Third Issue (FIXED)
After fixing the permission issue, a third error occurred: "invalid input syntax for type json" with the detail "Token \"purchase_roas\" is invalid". This was caused by the `create_default_scorecard_metrics` function trying to insert plain strings into a JSONB column that expects proper JSON structure.

## Solution Applied
1. Created a new API route at `/api/brands` that handles brand creation on the server side
2. Updated the `createBrand` function to use this API route instead of direct Supabase calls
3. The API route properly authenticates the user and uses their ID for brand creation
4. Created migration `20250131000007_fix_create_teams_permission.sql` to add `SECURITY DEFINER` to the team creation functions
5. Created migration `20250131000008_fix_scorecard_metrics_json.sql` to fix JSON syntax in the scorecard metrics creation function

## RLS Policy Check
The brands table has the following INSERT policies:
1. "Users can create brands" - allows INSERT when `auth.uid() = user_id`
2. "Users can insert their own brands" - allows INSERT when `auth.uid() = user_id`

## Debugging Steps

### 1. Check User Authentication
In the browser console, run:
```javascript
// Check if user is authenticated
const user = JSON.parse(localStorage.getItem('sb-jypbohpvphcigmfnxmmq-auth-token'));
console.log('User ID:', user?.user?.id);
console.log('User Email:', user?.user?.email);
```

### 2. Test Brand Creation Directly
In the browser console, run:
```javascript
// Test creating a brand directly
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const { data, error } = await supabase
  .from('brands')
  .insert({
    id: crypto.randomUUID(),
    user_id: '<USER_ID_HERE>', // Replace with actual user ID
    name: 'Test Brand',
    brand_info_data: {},
    target_audience_data: {},
    competition_data: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .select()
  .single();

console.log('Result:', { data, error });
```

### 3. Check RLS Context
To verify RLS is working for a specific user, you can create a function:

```sql
-- Run this in Supabase SQL editor as an admin
CREATE OR REPLACE FUNCTION check_brand_creation_permission(p_user_id uuid)
RETURNS TABLE (
  can_create boolean,
  current_user_id uuid,
  policy_check boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() IS NOT NULL as can_create,
    auth.uid() as current_user_id,
    (auth.uid() = p_user_id) as policy_check;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Then test it:
```sql
-- Replace with actual user ID
SELECT * FROM check_brand_creation_permission('USER_ID_HERE');
```

### 4. Common Issues and Solutions

#### Issue: User not authenticated
- **Symptom**: `user.id` is undefined or null
- **Solution**: Ensure user is logged in before attempting to create a brand

#### Issue: RLS policy blocking creation
- **Symptom**: Error message like "new row violates row-level security policy"
- **Solution**: Verify that the `user_id` being passed matches `auth.uid()`

#### Issue: Missing required fields
- **Symptom**: Error about null values in required columns
- **Solution**: Ensure all required fields are provided in the insert

#### Issue: Server-side client used in client component (FIXED)
- **Symptom**: 403 Forbidden error when creating brands
- **Solution**: Use API routes for database operations from client components

#### Issue: Permission denied for function (FIXED)
- **Symptom**: Error "permission denied for function create_default_teams_for_brand"
- **Solution**: Add `SECURITY DEFINER` to functions called by triggers so they run with elevated permissions

#### Issue: Invalid JSON syntax in scorecard metrics (FIXED)
- **Symptom**: Error "invalid input syntax for type json" with detail about "purchase_roas"
- **Solution**: Fix the `create_default_scorecard_metrics` function to use proper JSONB format for calculation formulas

### 5. Enable Detailed Logging
Add more logging to the brand creation function:

```typescript
const handleCreateBrand = async () => {
    console.log('Starting brand creation...');
    console.log('User ID:', user?.id);
    console.log('Brand Name:', newBrandName.trim());
    
    if (!user?.id) {
        console.error('No user ID available');
        setError('You must be logged in to create a brand');
        return;
    }
    
    if (!newBrandName.trim()) {
        console.error('Brand name is empty');
        setError('Brand name is required');
        return;
    }
    
    try {
        // ... rest of the function
    } catch (err) {
        console.error('Failed to create brand:', err);
        // Log the full error object
        console.error('Error details:', JSON.stringify(err, null, 2));
        setError(`Failed to create brand: ${err.message || 'Unknown error'}`);
    }
};
```

### 6. Check Supabase Logs
1. Go to your Supabase dashboard
2. Navigate to Logs > API
3. Filter for failed requests to the brands table
4. Look for specific error messages

## Testing with Supabase MCP
Note: The Supabase MCP tool uses a service role key and doesn't have user context, so `auth.uid()` will return null. This is why you can't test RLS policies directly with it. To test RLS policies, you need to use a client with proper user authentication. 
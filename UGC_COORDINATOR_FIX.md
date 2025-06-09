# UGC Coordinator Database Fix

## Problem
The UGC Coordinator dashboard is failing with these errors:
```
Error fetching workflow executions: {
  code: '42P01',
  message: 'relation "public.ugc_workflow_execution_view" does not exist'
}

Error fetching human review items: {
  code: '42P01', 
  message: 'relation "public.ugc_human_review_queue" does not exist'
}
```

## Root Cause
The UGC Coordinator dashboard API endpoints are trying to query database tables/views that don't exist yet:

1. **`ugc_workflow_execution_view`** - A database view expected by `/api/ugc/workflow/executions`
2. **`ugc_human_review_queue`** - A table expected by `/api/ugc/workflow/human-review`

These are part of the full UGC workflow system migration files, but they haven't been run on your database yet.

## Solution
I've created a minimal migration file that creates just the essential tables and views needed to get the UGC Coordinator working without errors:

**File:** `supabase/migrations/20250116000003_create_minimal_ugc_coordinator_tables.sql`

### What This Migration Creates:

1. **`ugc_human_intervention_queue` table** - Stores human review items
2. **`ugc_human_review_queue` view** - Maps to the table with the column names the API expects
3. **`ugc_workflow_execution_view` view** - Returns empty results until full workflow tables exist
4. **RLS policies** - Proper brand sharing support
5. **Indexes** - For performance

### Key Features:

- **Brand-specific access control** using the correct `brand_shares` table
- **Empty workflow executions** - The view returns no rows until you have actual workflow data
- **Functional human review queue** - Ready to store human intervention items
- **Proper permissions** - Only users with brand access can see relevant data

## How to Fix

1. **Run the migration** in your Supabase SQL Editor:
   ```sql
   -- Copy and paste the contents of:
   -- supabase/migrations/20250116000003_create_minimal_ugc_coordinator_tables.sql
   ```

2. **Verify the fix** by refreshing the UGC Coordinator dashboard

## Expected Behavior After Fix

- **No more database errors** - The API endpoints will work without throwing relation errors
- **Empty dashboard initially** - You'll see zero workflow executions and human review items (which is correct)
- **Ready for data** - When you eventually run full workflow migrations, the dashboard will show real data

## Future Steps

When you're ready to implement the full UGC workflow system, you can run the complete migration files:
1. `20250116000001_fix_ugc_workflow_brand_sharing.sql` - Full workflow tables with brand sharing
2. `20250116000002_add_dashboard_tables_fixed.sql` - Payment, contract, and shipment dashboards

## Why This Happened

The UGC Coordinator dashboard was built to work with the full workflow system, but the database tables weren't created yet. This minimal migration creates just enough infrastructure to prevent errors while keeping the door open for the full system later.

## Testing

After running the migration:
1. ✅ UGC Coordinator dashboard should load without errors
2. ✅ Overview tab should show all zeros (no active workflows)
3. ✅ Executions tab should show "No workflow executions yet"
4. ✅ Human Review tab should show no pending items
5. ✅ No database relation errors in console
#!/bin/bash
# Restore UGC tables from PostgreSQL .backup file

# Step 1: First, let's see what's in your backup file
echo "=== Checking backup contents ==="
echo "Looking for UGC tables in backup file..."
pg_restore --list backup.backup | grep -E "(ugc_creator_scripts|ugc_script_shares|ugc_creators)"

echo ""
echo "=== Step 2: Extract UGC tables to SQL files ==="

# Extract ugc_creators table to SQL
pg_restore --table=ugc_creators --data-only --column-inserts backup.backup > ugc_creators_restore.sql

# Extract ugc_creator_scripts table to SQL  
pg_restore --table=ugc_creator_scripts --data-only --column-inserts backup.backup > ugc_creator_scripts_restore.sql

# Extract ugc_script_shares table to SQL
pg_restore --table=ugc_script_shares --data-only --column-inserts backup.backup > ugc_script_shares_restore.sql

echo "Created restoration files:"
echo "- ugc_creators_restore.sql"
echo "- ugc_creator_scripts_restore.sql" 
echo "- ugc_script_shares_restore.sql"

echo ""
echo "=== Step 3: Apply fix migration first ==="
echo "Run this command to fix the cascade issue:"
echo "psql -h db.YOUR-PROJECT-REF.supabase.co -U postgres -d postgres -f supabase-nextjs-template/supabase/migrations/20260102000000_fix_ugc_creator_cascade_issue.sql"

echo ""
echo "=== Step 4: Restore the data ==="
echo "Then run these commands to restore data (in this order):"
echo "psql -h db.YOUR-PROJECT-REF.supabase.co -U postgres -d postgres -f ugc_creators_restore.sql"
echo "psql -h db.YOUR-PROJECT-REF.supabase.co -U postgres -d postgres -f ugc_creator_scripts_restore.sql"
echo "psql -h db.YOUR-PROJECT-REF.supabase.co -U postgres -d postgres -f ugc_script_shares_restore.sql"

echo ""
echo "=== Step 5: Verify restoration ==="
echo "Finally, run this to check if it worked:"
echo "psql -h db.YOUR-PROJECT-REF.supabase.co -U postgres -d postgres -c \"SELECT 'ugc_creators' as table_name, count(*) FROM ugc_creators UNION ALL SELECT 'ugc_creator_scripts', count(*) FROM ugc_creator_scripts UNION ALL SELECT 'ugc_script_shares', count(*) FROM ugc_script_shares;\"" 
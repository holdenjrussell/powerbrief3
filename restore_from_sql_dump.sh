#!/bin/bash
# Restore UGC tables from SQL text dump file

BACKUP_FILE="backup.backup"  # Change this to your actual backup filename

echo "=== Checking SQL dump contents ==="
echo "Looking for UGC tables in SQL dump..."
grep -E "CREATE TABLE.*ugc_creator" "$BACKUP_FILE" || echo "No CREATE TABLE statements found"
grep -E "COPY.*ugc_creator" "$BACKUP_FILE" || echo "No COPY statements found"

echo ""
echo "=== Step 2: Extract UGC tables from SQL dump ==="

# Extract ugc_creators table data
echo "Extracting ugc_creators..."
sed -n '/COPY public\.ugc_creators/,/^\\\.$/p' "$BACKUP_FILE" > ugc_creators_restore.sql

# Extract ugc_creator_scripts table data  
echo "Extracting ugc_creator_scripts..."
sed -n '/COPY public\.ugc_creator_scripts/,/^\\\.$/p' "$BACKUP_FILE" > ugc_creator_scripts_restore.sql

# Extract ugc_script_shares table data
echo "Extracting ugc_script_shares..."
sed -n '/COPY public\.ugc_script_shares/,/^\\\.$/p' "$BACKUP_FILE" > ugc_script_shares_restore.sql

echo ""
echo "=== Checking extracted files ==="
echo "ugc_creators_restore.sql lines: $(wc -l < ugc_creators_restore.sql)"
echo "ugc_creator_scripts_restore.sql lines: $(wc -l < ugc_creator_scripts_restore.sql)" 
echo "ugc_script_shares_restore.sql lines: $(wc -l < ugc_script_shares_restore.sql)"

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
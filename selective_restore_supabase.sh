#!/bin/bash
# Selective Table Restore from Supabase Backup
# This script helps extract and restore only specific tables

# Step 1: Download your Supabase backup file (if you haven't already)
# You can get this from Settings → Database → Backups in Supabase dashboard

# Step 2: Extract only the UGC tables from the backup
echo "Extracting UGC tables from backup..."

# If your backup is a .sql file, extract specific tables:
grep -A 10000 "CREATE TABLE.*ugc_creators" backup.sql | grep -B 10000 "CREATE TABLE.*\((?!ugc_)\)" > ugc_creators_schema.sql
grep -A 10000 "COPY.*ugc_creators" backup.sql | grep -B 10000 "COPY.*\((?!ugc_)\)" > ugc_creators_data.sql

grep -A 10000 "CREATE TABLE.*ugc_creator_scripts" backup.sql | grep -B 10000 "CREATE TABLE.*\((?!ugc_)\)" > ugc_scripts_schema.sql  
grep -A 10000 "COPY.*ugc_creator_scripts" backup.sql | grep -B 10000 "COPY.*\((?!ugc_)\)" > ugc_scripts_data.sql

# Step 3: Connect to your Supabase database
echo "Make sure you have your Supabase connection details ready:"
echo "Host: db.your-project-ref.supabase.co"
echo "Database: postgres"
echo "User: postgres"
echo "Port: 5432"

# Step 4: Apply the fix migration FIRST (to prevent future cascade issues)
echo "Apply the fix migration first:"
echo "psql -h db.your-project-ref.supabase.co -U postgres -d postgres -f supabase-nextjs-template/supabase/migrations/20260102000000_fix_ugc_creator_cascade_issue.sql"

# Step 5: Restore the extracted tables
echo "Then restore the UGC data:"
echo "psql -h db.your-project-ref.supabase.co -U postgres -d postgres -f ugc_creators_data.sql"
echo "psql -h db.your-project-ref.supabase.co -U postgres -d postgres -f ugc_scripts_data.sql" 
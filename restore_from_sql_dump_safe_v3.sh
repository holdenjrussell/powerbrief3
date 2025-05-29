#!/bin/bash
# Safely restore UGC tables from SQL text dump file (v3 - awk fix)
# Uses INSERT ON CONFLICT DO NOTHING to avoid overwriting existing data
# Handles complex data types, NULLs, and quotes within data

BACKUP_FILE="backup.backup"  # Change this to your actual backup filename

echo "=== Checking SQL dump contents ==="
echo "Looking for UGC tables in SQL dump..."
grep -E "CREATE TABLE.*ugc_creator" "$BACKUP_FILE" || echo "No CREATE TABLE statements found"
grep -E "COPY.*ugc_creator" "$BACKUP_FILE" || echo "No COPY statements found"

echo ""
echo "=== Step 2: Extract and convert UGC tables from SQL dump ==="

# Function to convert COPY statement to INSERT with ON CONFLICT DO NOTHING
convert_copy_to_insert() {
    local input_file="$1"
    local output_file="$2"
    local table_name="$3"
    
    if [ ! -s "$input_file" ]; then
        echo "No data found for $table_name in the backup."
        echo "-- No data to restore for $table_name" > "$output_file"
        return
    fi
    
    echo "Converting $table_name COPY to safe INSERT statements..."
    
    local columns_line=$(head -1 "$input_file")
    # Updated regex to be more greedy and handle complex column lists better
    local columns=$(echo "$columns_line" | sed -E 's/COPY public\.?"?'"$table_name"'"?\s*\((.*)\)\s*FROM stdin;/\1/')
    
    echo "-- Safe restoration for $table_name (won't overwrite existing records)" > "$output_file"
    echo "" >> "$output_file"
    
    # Corrected awk script
    tail -n +2 "$input_file" | head -n -1 | awk -F'\t' -v table="$table_name" -v cols="$columns" '
    {
        if ($0 == "\\.") next; 
        
        printf "INSERT INTO public.%s (%s) VALUES (", table, cols);
        for (i = 1; i <= NF; i++) {
            if ($i == "\\N") {
                printf "NULL";
            } else {
                # Correctly escape single quotes for SQL
                # Use octal \047 for single quote within awk's single-quoted script
                gsub(/\047/, "\047\047", $i);
                # Basic check for numerics/booleans vs strings needing quotes
                if ($i ~ /^[+-]?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$/ || $i ~ /^(true|false|TRUE|FALSE)$/) {
                    printf "%s", $i;
                } else {
                    printf "\047%s\047", $i; # Use octal for outer quotes as well
                }
            }
            if (i < NF) printf ", ";
        }
        printf ") ON CONFLICT (id) DO NOTHING;\n";
    }' >> "$output_file"
    
    echo "" >> "$output_file"
    echo "-- End of $table_name restoration" >> "$output_file"
}

# Extract ugc_creators table data
echo "Extracting ugc_creators..."
sed -n '/COPY public\.ugc_creators/,/^\\\.$/p' "$BACKUP_FILE" > ugc_creators_copy.sql
convert_copy_to_insert "ugc_creators_copy.sql" "ugc_creators_restore.sql" "ugc_creators"

# Extract ugc_creator_scripts table data  
echo "Extracting ugc_creator_scripts..."
sed -n '/COPY public\.ugc_creator_scripts/,/^\\\.$/p' "$BACKUP_FILE" > ugc_creator_scripts_copy.sql
convert_copy_to_insert "ugc_creator_scripts_copy.sql" "ugc_creator_scripts_restore.sql" "ugc_creator_scripts"

# Extract ugc_script_shares table data
echo "Extracting ugc_script_shares..."
sed -n '/COPY public\.ugc_script_shares/,/^\\\.$/p' "$BACKUP_FILE" > ugc_script_shares_copy.sql
convert_copy_to_insert "ugc_script_shares_copy.sql" "ugc_script_shares_restore.sql" "ugc_script_shares"

# Clean up temporary files
rm -f ugc_creators_copy.sql ugc_creator_scripts_copy.sql ugc_script_shares_copy.sql

echo ""
echo "=== Checking extracted files ==="
if [ -f "ugc_creators_restore.sql" ]; then echo "ugc_creators_restore.sql lines: $(wc -l < ugc_creators_restore.sql)"; else echo "ugc_creators_restore.sql not created (likely no data in backup)"; fi
if [ -f "ugc_creator_scripts_restore.sql" ]; then echo "ugc_creator_scripts_restore.sql lines: $(wc -l < ugc_creator_scripts_restore.sql)"; else echo "ugc_creator_scripts_restore.sql not created (likely no data in backup)"; fi
if [ -f "ugc_script_shares_restore.sql" ]; then echo "ugc_script_shares_restore.sql lines: $(wc -l < ugc_script_shares_restore.sql)"; else echo "ugc_script_shares_restore.sql not created (likely no data in backup)"; fi

echo ""
echo "=== Preview of generated INSERT statements (ugc_creators_restore.sql) ==="
if [ -f "ugc_creators_restore.sql" ]; then head -10 ugc_creators_restore.sql; else echo "No preview available."; fi
echo ""
echo "=== Preview of generated INSERT statements (ugc_creator_scripts_restore.sql) ==="
if [ -f "ugc_creator_scripts_restore.sql" ]; then head -10 ugc_creator_scripts_restore.sql; else echo "No preview available."; fi

echo ""
echo "=== Step 3: Apply fix migration first ==="
echo "Run this command to fix the cascade issue (replace YOUR-PROJECT-REF):"
echo "psql -h db.YOUR-PROJECT-REF.supabase.co -U postgres -d postgres -f ~/Documents/ad-brief-craft-ai/supabase-nextjs-template/supabase/migrations/20260102000000_fix_ugc_creator_cascade_issue.sql"

echo ""
echo "=== Step 4: Safely restore the data ==="
echo "These commands will only insert missing records (won't overwrite existing ones - replace YOUR-PROJECT-REF):"
echo "psql -h db.YOUR-PROJECT-REF.supabase.co -U postgres -d postgres -f ugc_creators_restore.sql"
echo "psql -h db.YOUR-PROJECT-REF.supabase.co -U postgres -d postgres -f ugc_creator_scripts_restore.sql"
echo "psql -h db.YOUR-PROJECT-REF.supabase.co -U postgres -d postgres -f ugc_script_shares_restore.sql"

echo ""
echo "=== Step 5: Verify restoration ==="
echo "Finally, run this to check if it worked (replace YOUR-PROJECT-REF):"
echo "psql -h db.YOUR-PROJECT-REF.supabase.co -U postgres -d postgres -c \"SELECT 'ugc_creators' as table_name, count(*) FROM ugc_creators UNION ALL SELECT 'ugc_creator_scripts', count(*) FROM ugc_creator_scripts UNION ALL SELECT 'ugc_script_shares', count(*) FROM ugc_script_shares;\""

echo ""
echo "=== Check specifically for TBD creators ==="
echo "To see if TBD creators were restored (replace YOUR-PROJECT-REF):"
echo "psql -h db.YOUR-PROJECT-REF.supabase.co -U postgres -d postgres -c \"SELECT c.id as creator_id, c.brand_id, c.name, count(s.id) as scripts_count FROM ugc_creators c LEFT JOIN ugc_creator_scripts s ON c.id = s.creator_id WHERE c.name = 'To Be Determined' GROUP BY c.id, c.brand_id, c.name ORDER BY c.brand_id;\"" 
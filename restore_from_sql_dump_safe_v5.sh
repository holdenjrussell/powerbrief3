#!/bin/bash
# Safely restore UGC tables from SQL text dump file (v5 - awk and head fix)
# Uses INSERT ON CONFLICT DO NOTHING to avoid overwriting existing data
# Handles complex data types, NULLs, and quotes within data

BACKUP_FILE="backup.backup"  # Change this to your actual backup filename

echo "=== Checking SQL dump contents ==="
echo "Looking for UGC tables in SQL dump..."
grep -iE "COPY public\.ugc_creators" "$BACKUP_FILE" || echo "No COPY statement found for ugc_creators"
grep -iE "COPY public\.ugc_creator_scripts" "$BACKUP_FILE" || echo "No COPY statement found for ugc_creator_scripts"
grep -iE "COPY public\.ugc_script_shares" "$BACKUP_FILE" || echo "No COPY statement found for ugc_script_shares"

echo ""
echo "=== Step 2: Extract and convert UGC tables from SQL dump ==="

# Function to convert COPY statement to INSERT with ON CONFLICT DO NOTHING
convert_copy_to_insert() {
    local input_copy_file="$1" # This file contains the raw COPY block
    local output_sql_file="$2"
    local table_name="$3"
    
    if [ ! -s "$input_copy_file" ]; then
        echo "No data found for $table_name in the backup (input_copy_file is empty or does not exist)."
        echo "-- No data to restore for $table_name" > "$output_sql_file"
        return
    fi
    
    echo "Converting $table_name COPY to safe INSERT statements..."
    
    # Extract the column list from the COPY statement line
    # This regex tries to capture content between parentheses robustly
    local columns_line=$(head -1 "$input_copy_file")
    local columns
    columns=$(echo "$columns_line" | sed -E 's/COPY public\.?"?'"$table_name"'"?\s*\(([^)]+)\)\s*FROM stdin;/\1/')

    if [ -z "$columns" ] || [ "$columns" == "$columns_line" ]; then
        echo "Error: Could not extract column list for $table_name from line: $columns_line"
        echo "-- Failed to extract columns for $table_name" > "$output_sql_file"
        return
    fi
    # Remove potential leading/trailing whitespace and quotes from individual column names if any
    columns=$(echo "$columns" | awk '{$1=$1;print}' | sed 's/"//g')

    echo "-- Safe restoration for $table_name (won't overwrite existing records)" > "$output_sql_file"
    echo "-- Extracted columns: $columns" >> "$output_sql_file"
    echo "" >> "$output_sql_file"
    
    # Process each data line (skip the COPY line and the \. line)
    # Use awk for more robust parsing of tab-separated values from COPY
    # And use `grep -v` to exclude the final \. line before piping to awk
    grep -v '^\\\.$' "$input_copy_file" | tail -n +2 | awk -F'\t' -v table="$table_name" -v cols="$columns" -v q="'" '
    BEGIN { OFS=","; quote=q }
    {
        # NF is number of fields for the current record
        printf "INSERT INTO public.%s (%s) VALUES (", table, cols);
        for (i = 1; i <= NF; i++) {
            current_val = $i;
            if (current_val == "\\N") {
                printf "NULL";
            } else {
                # Escape single quotes for SQL by replacing q with q q
                gsub(quote, quote quote, current_val);
                # Basic check for numerics/booleans vs strings needing quotes
                if (current_val ~ /^[+-]?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$/ || current_val ~ /^(true|false|TRUE|FALSE)$/) {
                    printf "%s", current_val;
                } else {
                    printf "%s%s%s", quote, current_val, quote; # Enclose in single quotes using the q variable
                }
            }
            if (i < NF) printf ", ";
        }
        printf ") ON CONFLICT (id) DO NOTHING;\n";
    }' >> "$output_sql_file"
    
    echo "" >> "$output_sql_file"
    echo "-- End of $table_name restoration" >> "$output_sql_file"
}

# --- Main extraction process ---
TABLES_TO_RESTORE=("ugc_creators" "ugc_creator_scripts" "ugc_script_shares")

for table in "${TABLES_TO_RESTORE[@]}"; do
    echo "Extracting $table..."
    # Extract the whole COPY block for the current table
    sed -n "/COPY public\.${table}\s*(/,/^\\\.$/p" "$BACKUP_FILE" > "${table}_copy.sql"
    
    # Check if data was actually extracted for this table
    if grep -q "COPY public\.${table}" "${table}_copy.sql"; then
        convert_copy_to_insert "${table}_copy.sql" "${table}_restore.sql" "$table"
    else
        echo "No COPY block found for $table in $BACKUP_FILE."
        echo "-- No data to restore for $table" > "${table}_restore.sql"
    fi
done

# Clean up temporary files
rm -f *_copy.sql

echo ""
echo "=== Checking extracted files ==="
for table in "${TABLES_TO_RESTORE[@]}"; do
    if [ -f "${table}_restore.sql" ]; then 
        echo "${table}_restore.sql lines: $(wc -l < "${table}_restore.sql")"
    else 
        echo "${table}_restore.sql not created (likely no data in backup or extraction error for this table)."
    fi
done

for table_sql in ugc_creators_restore.sql ugc_creator_scripts_restore.sql; do
    echo ""
    echo "=== Preview of generated INSERT statements (${table_sql}) ==="
    if [ -f "${table_sql}" ]; then head -10 "${table_sql}"; else echo "No preview available for ${table_sql}."; fi
done

echo ""
echo "=== Step 3: Apply fix migration first ==="
echo "Run this command to fix the cascade issue (replace YOUR-PROJECT-REF):"
echo "psql -h db.YOUR-PROJECT-REF.supabase.co -U postgres -d postgres -f ~/Documents/ad-brief-craft-ai/supabase-nextjs-template/supabase/migrations/20260102000000_fix_ugc_creator_cascade_issue.sql"

echo ""
echo "=== Step 4: Safely restore the data ==="
echo "These commands will only insert missing records (won't overwrite existing ones - replace YOUR-PROJECT-REF):"
for table in "${TABLES_TO_RESTORE[@]}"; do
    echo "psql -h db.YOUR-PROJECT-REF.supabase.co -U postgres -d postgres -f ${table}_restore.sql"
done

echo ""
echo "=== Step 5: Verify restoration ==="
echo "Finally, run this to check if it worked (replace YOUR-PROJECT-REF):"
echo "psql -h db.YOUR-PROJECT-REF.supabase.co -U postgres -d postgres -c \"SELECT 'ugc_creators' as table_name, count(*) FROM ugc_creators UNION ALL SELECT 'ugc_creator_scripts', count(*) FROM ugc_creator_scripts UNION ALL SELECT 'ugc_script_shares', count(*) FROM ugc_script_shares;\""

echo ""
echo "=== Check specifically for TBD creators ==="
echo "To see if TBD creators were restored (replace YOUR-PROJECT-REF):"
echo "psql -h db.YOUR-PROJECT-REF.supabase.co -U postgres -d postgres -c \"SELECT c.id as creator_id, c.brand_id, c.name, count(s.id) as scripts_count FROM ugc_creators c LEFT JOIN ugc_creator_scripts s ON c.id = s.creator_id WHERE c.name = 'To Be Determined' GROUP BY c.id, c.brand_id, c.name ORDER BY c.brand_id;\"" 
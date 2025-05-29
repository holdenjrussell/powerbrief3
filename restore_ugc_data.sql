-- Script to restore UGC data from a partial backup
-- IMPORTANT: Run this AFTER applying the fix migration to prevent cascade issues

-- 1. First, apply the fix migration to prevent future cascade deletions:
-- \i supabase-nextjs-template/supabase/migrations/20260102000000_fix_ugc_creator_cascade_issue.sql

-- 2. If you have a backup of ugc_creators table, restore it first:
-- COPY public.ugc_creators FROM '/path/to/ugc_creators_backup.csv' WITH CSV HEADER;
-- OR
-- INSERT INTO public.ugc_creators SELECT * FROM backup_ugc_creators;

-- 3. Then restore ugc_creator_scripts:
-- COPY public.ugc_creator_scripts FROM '/path/to/ugc_creator_scripts_backup.csv' WITH CSV HEADER;
-- OR  
-- INSERT INTO public.ugc_creator_scripts SELECT * FROM backup_ugc_creator_scripts;

-- 4. Verify the restore worked:
SELECT 
  'ugc_creators' as table_name,
  count(*) as row_count 
FROM public.ugc_creators
UNION ALL
SELECT 
  'ugc_creator_scripts' as table_name,
  count(*) as row_count 
FROM public.ugc_creator_scripts;

-- 5. Check for orphaned scripts (should be 0 after proper restore):
SELECT count(*) as orphaned_scripts
FROM public.ugc_creator_scripts 
WHERE creator_id IS NOT NULL 
AND creator_id NOT IN (SELECT id FROM public.ugc_creators); 
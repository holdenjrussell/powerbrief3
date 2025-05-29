-- Fix AdRipper Data Integrity Issues
-- This script ensures all social_media_content records have proper user_id values

-- 1. First, let's see the current state of the data
SELECT 
    'Current Data State' as check_type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN smc.user_id IS NULL THEN 1 END) as content_without_user_id,
    COUNT(CASE WHEN smc.user_id = b.user_id THEN 1 END) as matching_user_ids,
    COUNT(CASE WHEN smc.user_id != b.user_id THEN 1 END) as mismatched_user_ids
FROM public.social_media_content smc
LEFT JOIN public.brands b ON smc.brand_id = b.id;

-- 2. Update all social_media_content records to have the correct user_id from their associated brand
UPDATE public.social_media_content smc
SET user_id = b.user_id
FROM public.brands b
WHERE smc.brand_id = b.id
AND (smc.user_id IS NULL OR smc.user_id != b.user_id);

-- 3. Verify the fix
SELECT 
    'After Fix' as check_type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN smc.user_id IS NULL THEN 1 END) as content_without_user_id,
    COUNT(CASE WHEN smc.user_id = b.user_id THEN 1 END) as matching_user_ids,
    COUNT(CASE WHEN smc.user_id != b.user_id THEN 1 END) as mismatched_user_ids
FROM public.social_media_content smc
LEFT JOIN public.brands b ON smc.brand_id = b.id;

-- 4. Check for orphaned content (content without a valid brand)
SELECT 
    'Orphaned Content' as check_type,
    COUNT(*) as count
FROM public.social_media_content smc
WHERE NOT EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = smc.brand_id
);

-- 5. Optional: Delete orphaned content (uncomment if you want to clean up)
-- DELETE FROM public.social_media_content smc
-- WHERE NOT EXISTS (
--     SELECT 1 FROM public.brands b WHERE b.id = smc.brand_id
-- );

-- 6. Ensure RLS is enabled on both tables
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_content ENABLE ROW LEVEL SECURITY;

-- 7. Final check: Show a sample of content with brand info
SELECT 
    smc.id,
    smc.title,
    smc.platform,
    smc.user_id as content_user_id,
    b.name as brand_name,
    b.user_id as brand_user_id,
    CASE 
        WHEN smc.user_id = b.user_id THEN '✓ Match'
        ELSE '✗ Mismatch'
    END as user_match_status
FROM public.social_media_content smc
LEFT JOIN public.brands b ON smc.brand_id = b.id
ORDER BY smc.created_at DESC
LIMIT 10; 
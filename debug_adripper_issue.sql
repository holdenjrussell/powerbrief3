-- Debug AdRipper Issue
-- Run this script in Supabase SQL Editor to diagnose the problem

-- 1. First, let's check if RLS is enabled
SELECT 
    'brands' as table_name,
    (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'brands' AND rowsecurity = true) as rls_enabled
UNION ALL
SELECT 
    'social_media_content' as table_name,
    (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'social_media_content' AND rowsecurity = true) as rls_enabled;

-- 2. Check current user
SELECT auth.uid() as current_user_id;

-- 3. Check brands data
SELECT 
    'Total brands' as metric,
    COUNT(*) as count
FROM public.brands
UNION ALL
SELECT 
    'Brands with user_id' as metric,
    COUNT(*) as count
FROM public.brands
WHERE user_id IS NOT NULL
UNION ALL
SELECT 
    'Brands without user_id' as metric,
    COUNT(*) as count
FROM public.brands
WHERE user_id IS NULL;

-- 4. Check social_media_content data
SELECT 
    'Total content' as metric,
    COUNT(*) as count
FROM public.social_media_content
UNION ALL
SELECT 
    'Content with user_id' as metric,
    COUNT(*) as count
FROM public.social_media_content
WHERE user_id IS NOT NULL
UNION ALL
SELECT 
    'Content without user_id' as metric,
    COUNT(*) as count
FROM public.social_media_content
WHERE user_id IS NULL;

-- 5. Show sample of brands (with user_id visible)
SELECT 
    id,
    name,
    user_id,
    created_at
FROM public.brands
ORDER BY created_at DESC
LIMIT 5;

-- 6. Show sample of social_media_content (with user_id and brand_id visible)
SELECT 
    id,
    brand_id,
    user_id,
    platform,
    title,
    created_at
FROM public.social_media_content
ORDER BY created_at DESC
LIMIT 5;

-- 7. Check if there are any mismatches between content user_id and brand user_id
SELECT 
    smc.id as content_id,
    smc.user_id as content_user_id,
    b.user_id as brand_user_id,
    smc.brand_id,
    b.name as brand_name,
    CASE 
        WHEN smc.user_id = b.user_id THEN 'MATCH'
        ELSE 'MISMATCH'
    END as user_match_status
FROM public.social_media_content smc
LEFT JOIN public.brands b ON smc.brand_id = b.id
WHERE smc.user_id != b.user_id OR smc.user_id IS NULL OR b.user_id IS NULL
LIMIT 10;

-- 8. Check current RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd as operation,
    qual as using_expression
FROM pg_policies 
WHERE tablename IN ('brands', 'social_media_content') 
AND schemaname = 'public'
ORDER BY tablename, policyname; 
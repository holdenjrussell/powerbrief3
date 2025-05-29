-- Comprehensive AdRipper RLS Debug Script
-- Run this in your Supabase SQL Editor to diagnose the exact issue

-- 1. Check if RLS is enabled on both tables
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('brands', 'social_media_content') 
AND schemaname = 'public';

-- 2. Check current RLS policies on brands table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_clause,
    with_check
FROM pg_policies 
WHERE tablename = 'brands' 
AND schemaname = 'public'
ORDER BY policyname;

-- 3. Check current RLS policies on social_media_content table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_clause,
    with_check
FROM pg_policies 
WHERE tablename = 'social_media_content' 
AND schemaname = 'public'
ORDER BY policyname;

-- 4. Check brands table structure and data
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'brands' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Check social_media_content table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'social_media_content' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Check actual brands data (first 5 records)
SELECT 
    id,
    name,
    user_id,
    organization_id,
    created_at
FROM public.brands 
ORDER BY created_at DESC 
LIMIT 5;

-- 7. Check actual social_media_content data (first 5 records)
SELECT 
    id,
    brand_id,
    user_id,
    platform,
    title,
    content_type,
    source_type,
    created_at
FROM public.social_media_content 
ORDER BY created_at DESC 
LIMIT 5;

-- 8. Check if there's content for specific brand-user combinations
SELECT 
    b.name as brand_name,
    b.user_id as brand_user_id,
    COUNT(smc.id) as content_count,
    COUNT(CASE WHEN smc.user_id = b.user_id THEN 1 END) as matching_user_content,
    COUNT(CASE WHEN smc.user_id != b.user_id THEN 1 END) as mismatched_user_content
FROM public.brands b
LEFT JOIN public.social_media_content smc ON b.id = smc.brand_id
GROUP BY b.id, b.name, b.user_id
ORDER BY content_count DESC;

-- 9. Check for orphaned content (content without matching brands)
SELECT 
    smc.id,
    smc.brand_id,
    smc.user_id,
    smc.title,
    b.name as brand_name,
    b.user_id as brand_user_id
FROM public.social_media_content smc
LEFT JOIN public.brands b ON smc.brand_id = b.id
WHERE b.id IS NULL;

-- 10. Test RLS policy evaluation for a specific user
-- Replace 'YOUR_USER_ID' with the actual user ID from the logs
-- SELECT 
--     id,
--     brand_id,
--     user_id,
--     title,
--     created_at,
--     CASE 
--         WHEN user_id = 'YOUR_USER_ID' THEN 'SHOULD_BE_VISIBLE'
--         ELSE 'SHOULD_BE_HIDDEN'
--     END as rls_expectation
-- FROM public.social_media_content
-- ORDER BY created_at DESC;

-- 11. Create a helper function to check RLS policies (if it doesn't exist)
CREATE OR REPLACE FUNCTION check_rls_policies(table_name text)
RETURNS TABLE(policy_name text, policy_definition text) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        policyname::text,
        (qual || COALESCE(' WITH CHECK (' || with_check || ')', ''))::text
    FROM pg_policies 
    WHERE tablename = table_name 
    AND schemaname = 'public';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Check if the current user context is working
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role,
    current_user as postgres_user;

-- 13. Test a simple query that should work with RLS
-- This will help us see if the issue is with the policies or the data
SELECT COUNT(*) as total_brands FROM public.brands;
SELECT COUNT(*) as total_content FROM public.social_media_content; 
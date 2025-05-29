-- Debug AdRipper Brands Loading Issue
-- Run these queries in your Supabase SQL Editor to diagnose the problem

-- 1. Check if RLS is enabled on brands table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'brands' AND schemaname = 'public';

-- 2. Check current RLS policies on brands table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'brands' AND schemaname = 'public'
ORDER BY policyname;

-- 3. Check if brands table has data and user_id column
SELECT 
    COUNT(*) as total_brands,
    COUNT(user_id) as brands_with_user_id,
    COUNT(organization_id) as brands_with_org_id
FROM public.brands;

-- 4. Check sample brand data (first 5 records)
SELECT id, name, user_id, organization_id, created_at 
FROM public.brands 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Check if there are any users in auth.users
SELECT COUNT(*) as total_users FROM auth.users;

-- 6. Test direct brand query without RLS (as admin)
-- This will show what brands exist regardless of RLS
SET row_security = off;
SELECT id, name, user_id, organization_id 
FROM public.brands 
ORDER BY name 
LIMIT 10;
SET row_security = on;

-- 7. Check organization_members table if it exists
SELECT COUNT(*) as total_org_members 
FROM public.organization_members;

-- 8. Test what a specific user can see (replace with actual user ID)
-- First, get a user ID:
SELECT id, email FROM auth.users LIMIT 1;

-- Then test what that user can see (replace 'USER_ID_HERE' with actual ID):
-- SELECT id, name FROM public.brands WHERE auth.uid() = 'USER_ID_HERE'::uuid;

-- 9. Check if there are any brands linked to brief_batches (for the data migration part)
SELECT 
    COUNT(DISTINCT b.id) as brands_in_batches,
    COUNT(DISTINCT bb.brand_id) as unique_brand_ids_in_batches
FROM public.brands b
LEFT JOIN public.brief_batches bb ON b.id = bb.brand_id; 
-- Temporary Fix for AdRipper Brands Not Loading
-- This will temporarily make brands visible while we debug the root cause

-- First, let's check what's wrong and fix it step by step

-- 1. Temporarily disable RLS on brands to see if that's the issue
-- (You can re-enable it after we fix the data)
-- ALTER TABLE public.brands DISABLE ROW LEVEL SECURITY;

-- 2. Or, create a more permissive temporary policy
DROP POLICY IF EXISTS "Users can view their own brands" ON public.brands;

-- Create a temporary permissive policy for debugging
CREATE POLICY "Temporary - Users can view all brands" 
    ON public.brands FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- 3. Check and fix user_id assignments for brands
-- First, let's see which brands don't have user_id
SELECT id, name, user_id, organization_id 
FROM public.brands 
WHERE user_id IS NULL;

-- 4. Try to assign user_id to brands that don't have it
-- Method 1: From brief_batches
UPDATE public.brands 
SET user_id = (
    SELECT user_id 
    FROM public.brief_batches 
    WHERE brand_id = brands.id 
    LIMIT 1
)
WHERE user_id IS NULL 
AND EXISTS (
    SELECT 1 
    FROM public.brief_batches 
    WHERE brand_id = brands.id
);

-- Method 2: If there's only one user, assign all brands to them
-- (Only run this if you have a single-user system)
-- UPDATE public.brands 
-- SET user_id = (SELECT id FROM auth.users LIMIT 1)
-- WHERE user_id IS NULL;

-- 5. Check the results
SELECT 
    COUNT(*) as total_brands,
    COUNT(user_id) as brands_with_user_id,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as brands_without_user_id
FROM public.brands;

-- 6. Show sample data
SELECT id, name, user_id, organization_id 
FROM public.brands 
ORDER BY created_at DESC 
LIMIT 5; 
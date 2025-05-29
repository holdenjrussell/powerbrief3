-- Fix AdRipper to Match PowerBrief Pattern
-- This migration ensures the brands RLS policies match exactly what PowerBrief uses

-- First, let's see what the current PowerBrief schema uses
-- PowerBrief uses simple user_id based filtering: auth.uid() = user_id

-- Drop any complex or problematic policies
DROP POLICY IF EXISTS "Users can view their own brands" ON public.brands;
DROP POLICY IF EXISTS "Authenticated users can view all brands" ON public.brands;
DROP POLICY IF EXISTS "Temporary - Users can view all brands" ON public.brands;

-- Create the exact same policy that PowerBrief uses
CREATE POLICY "Users can view their own brands"
    ON public.brands FOR SELECT
    USING (auth.uid() = user_id);

-- Also ensure the other CRUD policies match PowerBrief exactly
DROP POLICY IF EXISTS "Users can insert their own brands" ON public.brands;
CREATE POLICY "Users can insert their own brands"
    ON public.brands FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own brands" ON public.brands;
CREATE POLICY "Users can update their own brands"
    ON public.brands FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own brands" ON public.brands;
CREATE POLICY "Users can delete their own brands"
    ON public.brands FOR DELETE
    USING (auth.uid() = user_id);

-- Ensure all brands have user_id set (this is the key issue)
-- Update brands that don't have user_id by linking them to brief_batches
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

-- If there are still brands without user_id and you have only one user, assign them
-- (Uncomment the next 3 lines if needed)
-- UPDATE public.brands 
-- SET user_id = (SELECT id FROM auth.users LIMIT 1)
-- WHERE user_id IS NULL;

-- Verify the fix worked
SELECT 
    COUNT(*) as total_brands,
    COUNT(user_id) as brands_with_user_id,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as brands_without_user_id
FROM public.brands; 
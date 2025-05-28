-- Final AdRipper RLS Fix
-- This addresses the specific issues preventing content from loading

-- Step 1: Drop all existing problematic policies
DROP POLICY IF EXISTS "Users can view their own social media content" ON public.social_media_content;
DROP POLICY IF EXISTS "Users can insert their own social media content" ON public.social_media_content;
DROP POLICY IF EXISTS "Users can update their own social media content" ON public.social_media_content;
DROP POLICY IF EXISTS "Users can delete their own social media content" ON public.social_media_content;

DROP POLICY IF EXISTS "Users can view social media content for accessible brands" ON public.social_media_content;
DROP POLICY IF EXISTS "Users can insert social media content for accessible brands" ON public.social_media_content;
DROP POLICY IF EXISTS "Users can update social media content for accessible brands" ON public.social_media_content;
DROP POLICY IF EXISTS "Users can delete social media content for accessible brands" ON public.social_media_content;

-- Step 2: Ensure the user_id column exists and is properly set
-- Check if all social_media_content records have user_id
UPDATE public.social_media_content 
SET user_id = (
    SELECT user_id 
    FROM public.brands 
    WHERE brands.id = social_media_content.brand_id 
    LIMIT 1
)
WHERE user_id IS NULL 
AND EXISTS (
    SELECT 1 
    FROM public.brands 
    WHERE brands.id = social_media_content.brand_id
);

-- Step 3: Create simple, working RLS policies
-- These match exactly what PowerBrief uses and what works in other parts of the app

CREATE POLICY "Users can view their own social media content"
    ON public.social_media_content FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social media content"
    ON public.social_media_content FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social media content"
    ON public.social_media_content FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social media content"
    ON public.social_media_content FOR DELETE
    USING (auth.uid() = user_id);

-- Step 4: Ensure brands table has proper policies too
DROP POLICY IF EXISTS "Users can view their own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can insert their own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can update their own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can delete their own brands" ON public.brands;

-- Add user_id column to brands if it doesn't exist
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update brands to have user_id set (temporary fix for existing data)
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

-- Create simple brand policies
CREATE POLICY "Users can view their own brands"
    ON public.brands FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brands"
    ON public.brands FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brands"
    ON public.brands FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brands"
    ON public.brands FOR DELETE
    USING (auth.uid() = user_id);

-- Step 5: Verify the fix
-- Check that we have data with proper user_id assignments
SELECT 
    'brands' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as records_with_user_id,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as records_without_user_id
FROM public.brands

UNION ALL

SELECT 
    'social_media_content' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as records_with_user_id,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as records_without_user_id
FROM public.social_media_content;

-- Step 6: Test the policies work
-- This should return the current user's content when run from the app
-- SELECT 
--     smc.id,
--     smc.title,
--     smc.platform,
--     smc.user_id,
--     b.name as brand_name,
--     b.user_id as brand_user_id
-- FROM public.social_media_content smc
-- JOIN public.brands b ON smc.brand_id = b.id
-- ORDER BY smc.created_at DESC; 
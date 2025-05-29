-- Fix AdRipper User Filtering Issues
-- This migration fixes two main issues:
-- 1. Brands showing from other users (should only show user's own brands)
-- 2. Social media content not loading properly

-- First, let's check the current state and fix the brands table RLS policies
-- Drop any overly permissive brand policies
DROP POLICY IF EXISTS "Authenticated users can view all brands" ON public.brands;
DROP POLICY IF EXISTS "Authenticated users can insert brands" ON public.brands;
DROP POLICY IF EXISTS "Authenticated users can update brands" ON public.brands;
DROP POLICY IF EXISTS "Authenticated users can delete brands" ON public.brands;

-- Ensure we have the user_id column (should already exist from previous migrations)
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create proper restrictive brand policies that only allow users to see their own brands
-- or brands from organizations they belong to
DROP POLICY IF EXISTS "Users can view their own brands" ON public.brands;
CREATE POLICY "Users can view their own brands" 
    ON public.brands FOR SELECT
    USING (
        auth.uid() = user_id OR
        (
            organization_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.organization_members 
                WHERE organization_id = brands.organization_id 
                AND user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can insert their own brands" ON public.brands;
CREATE POLICY "Users can insert their own brands" 
    ON public.brands FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own brands" ON public.brands;
CREATE POLICY "Users can update their own brands" 
    ON public.brands FOR UPDATE
    USING (
        auth.uid() = user_id OR
        (
            organization_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.organization_members 
                WHERE organization_id = brands.organization_id 
                AND user_id = auth.uid()
                AND role IN ('owner', 'admin')
            )
        )
    );

DROP POLICY IF EXISTS "Users can delete their own brands" ON public.brands;
CREATE POLICY "Users can delete their own brands" 
    ON public.brands FOR DELETE
    USING (
        auth.uid() = user_id OR
        (
            organization_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.organization_members 
                WHERE organization_id = brands.organization_id 
                AND user_id = auth.uid()
                AND role = 'owner'
            )
        )
    );

-- Now fix the social media content policies
-- Drop any overly permissive or problematic policies
DROP POLICY IF EXISTS "Users can view social media content for accessible brands" ON public.social_media_content;
DROP POLICY IF EXISTS "Users can insert social media content for accessible brands" ON public.social_media_content;
DROP POLICY IF EXISTS "Users can update social media content for accessible brands" ON public.social_media_content;
DROP POLICY IF EXISTS "Users can delete social media content for accessible brands" ON public.social_media_content;

-- Drop the helper function if it exists
DROP FUNCTION IF EXISTS user_has_brand_access(UUID);

-- Create proper social media content policies
-- Users can only see content they uploaded or content for brands they have access to
DROP POLICY IF EXISTS "Users can view their own social media content" ON public.social_media_content;
CREATE POLICY "Users can view their own social media content" 
    ON public.social_media_content FOR SELECT
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.brands 
            WHERE brands.id = social_media_content.brand_id 
            AND (
                brands.user_id = auth.uid() OR
                (
                    brands.organization_id IS NOT NULL AND
                    EXISTS (
                        SELECT 1 FROM public.organization_members 
                        WHERE organization_id = brands.organization_id 
                        AND user_id = auth.uid()
                    )
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can insert their own social media content" ON public.social_media_content;
CREATE POLICY "Users can insert their own social media content" 
    ON public.social_media_content FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.brands 
            WHERE brands.id = social_media_content.brand_id 
            AND (
                brands.user_id = auth.uid() OR
                (
                    brands.organization_id IS NOT NULL AND
                    EXISTS (
                        SELECT 1 FROM public.organization_members 
                        WHERE organization_id = brands.organization_id 
                        AND user_id = auth.uid()
                        AND role IN ('owner', 'admin', 'member')
                    )
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can update their own social media content" ON public.social_media_content;
CREATE POLICY "Users can update their own social media content" 
    ON public.social_media_content FOR UPDATE
    USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.brands 
            WHERE brands.id = social_media_content.brand_id 
            AND (
                brands.user_id = auth.uid() OR
                (
                    brands.organization_id IS NOT NULL AND
                    EXISTS (
                        SELECT 1 FROM public.organization_members 
                        WHERE organization_id = brands.organization_id 
                        AND user_id = auth.uid()
                        AND role IN ('owner', 'admin', 'member')
                    )
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can delete their own social media content" ON public.social_media_content;
CREATE POLICY "Users can delete their own social media content" 
    ON public.social_media_content FOR DELETE
    USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.brands 
            WHERE brands.id = social_media_content.brand_id 
            AND (
                brands.user_id = auth.uid() OR
                (
                    brands.organization_id IS NOT NULL AND
                    EXISTS (
                        SELECT 1 FROM public.organization_members 
                        WHERE organization_id = brands.organization_id 
                        AND user_id = auth.uid()
                        AND role IN ('owner', 'admin')
                    )
                )
            )
        )
    );

-- Ensure all brands have a user_id (for existing data)
-- This is a safety measure for any brands that might not have user_id set
-- In a real migration, you'd want to be more careful about this
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS brands_user_id_idx ON public.brands(user_id);
CREATE INDEX IF NOT EXISTS brands_organization_id_idx ON public.brands(organization_id);
CREATE INDEX IF NOT EXISTS social_media_content_user_id_idx ON public.social_media_content(user_id);
CREATE INDEX IF NOT EXISTS social_media_content_brand_id_idx ON public.social_media_content(brand_id);

-- Add comments to document the fix
COMMENT ON POLICY "Users can view their own brands" ON public.brands IS 'Users can view brands they own or brands from organizations they belong to';
COMMENT ON POLICY "Users can view their own social media content" ON public.social_media_content IS 'Users can view social media content they uploaded or content for brands they have access to';

-- Verify the policies are working by checking if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('brands', 'social_media_content') 
AND schemaname = 'public'; 
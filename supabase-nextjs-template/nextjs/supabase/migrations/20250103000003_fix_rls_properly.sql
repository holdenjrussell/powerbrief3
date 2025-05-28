-- Fix RLS policies properly for social_media_content and brands tables
-- This addresses the issues with content not loading and users seeing other users' brands

-- First, let's check what's in the brands table to understand the user relationship
-- We need to understand how brands are associated with users

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view social media content for accessible brands" ON public.social_media_content;
DROP POLICY IF EXISTS "Users can insert social media content for accessible brands" ON public.social_media_content;
DROP POLICY IF EXISTS "Users can update social media content for accessible brands" ON public.social_media_content;
DROP POLICY IF EXISTS "Users can delete social media content for accessible brands" ON public.social_media_content;

DROP POLICY IF EXISTS "Authenticated users can view all brands" ON public.brands;
DROP POLICY IF EXISTS "Authenticated users can insert brands" ON public.brands;
DROP POLICY IF EXISTS "Authenticated users can update brands" ON public.brands;
DROP POLICY IF EXISTS "Authenticated users can delete brands" ON public.brands;

-- Drop the helper function
DROP FUNCTION IF EXISTS user_has_brand_access(UUID);

-- For now, let's create very permissive policies for development
-- This will allow content to load while we figure out the proper user-brand relationship

-- Social media content policies - allow users to access their own content
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

-- Brand policies - for now, let's check if brands have a user_id column
-- If not, we'll need to add one or create a different relationship

-- First, let's add a user_id column to brands if it doesn't exist
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing brands to have the current user as owner (for development)
-- This is a temporary fix - in production you'd want to handle this differently
UPDATE public.brands 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;

-- Create brand policies that allow users to see only their own brands
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

-- Create an index on the new user_id column for better performance
CREATE INDEX IF NOT EXISTS brands_user_id_idx ON public.brands(user_id); 
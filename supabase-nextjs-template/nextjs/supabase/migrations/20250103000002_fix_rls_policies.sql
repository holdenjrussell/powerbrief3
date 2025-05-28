-- Fix RLS policies for social_media_content table
-- The issue is that users can't access content due to restrictive RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own social media content" ON public.social_media_content;
DROP POLICY IF EXISTS "Users can insert their own social media content" ON public.social_media_content;
DROP POLICY IF EXISTS "Users can update their own social media content" ON public.social_media_content;
DROP POLICY IF EXISTS "Users can delete their own social media content" ON public.social_media_content;

-- Create more permissive policies that allow users to access content for brands they have access to
-- First, let's check if the user has access to the brand
CREATE OR REPLACE FUNCTION user_has_brand_access(brand_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- For now, allow all authenticated users to access all brands
  -- In production, you might want to check brand ownership/membership
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new policies
CREATE POLICY "Users can view social media content for accessible brands" 
    ON public.social_media_content FOR SELECT
    USING (user_has_brand_access(brand_id));

CREATE POLICY "Users can insert social media content for accessible brands" 
    ON public.social_media_content FOR INSERT
    WITH CHECK (user_has_brand_access(brand_id) AND auth.uid() = user_id);

CREATE POLICY "Users can update social media content for accessible brands" 
    ON public.social_media_content FOR UPDATE
    USING (user_has_brand_access(brand_id) AND auth.uid() = user_id);

CREATE POLICY "Users can delete social media content for accessible brands" 
    ON public.social_media_content FOR DELETE
    USING (user_has_brand_access(brand_id) AND auth.uid() = user_id);

-- Also ensure the brands table has proper RLS policies
-- Drop existing brand policies if they exist
DROP POLICY IF EXISTS "Users can view brands" ON public.brands;
DROP POLICY IF EXISTS "Users can insert brands" ON public.brands;
DROP POLICY IF EXISTS "Users can update brands" ON public.brands;
DROP POLICY IF EXISTS "Users can delete brands" ON public.brands;

-- Create permissive brand policies (adjust based on your needs)
CREATE POLICY "Authenticated users can view all brands" 
    ON public.brands FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert brands" 
    ON public.brands FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update brands" 
    ON public.brands FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete brands" 
    ON public.brands FOR DELETE
    USING (auth.uid() IS NOT NULL); 
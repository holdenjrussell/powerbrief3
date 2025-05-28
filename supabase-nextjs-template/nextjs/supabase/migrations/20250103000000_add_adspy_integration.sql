-- Add AdSpy Integration Support
-- This migration adds support for AdSpy API integration with credential storage and search history

-- Add AdSpy credentials to brands table
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS adspy_username TEXT,
ADD COLUMN IF NOT EXISTS adspy_password_encrypted TEXT,
ADD COLUMN IF NOT EXISTS adspy_token TEXT,
ADD COLUMN IF NOT EXISTS adspy_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS adspy_enabled BOOLEAN DEFAULT false;

-- Create table for AdSpy search history
CREATE TABLE IF NOT EXISTS public.adspy_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Search parameters
    search_params JSONB NOT NULL, -- Store the full search query
    search_name TEXT, -- Optional name for saved searches
    
    -- Results metadata
    total_results INTEGER,
    page_searched INTEGER DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_used_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for AdSpy searches
CREATE INDEX IF NOT EXISTS adspy_searches_brand_id_idx ON public.adspy_searches(brand_id);
CREATE INDEX IF NOT EXISTS adspy_searches_user_id_idx ON public.adspy_searches(user_id);
CREATE INDEX IF NOT EXISTS adspy_searches_created_at_idx ON public.adspy_searches(created_at DESC);
CREATE INDEX IF NOT EXISTS adspy_searches_last_used_idx ON public.adspy_searches(last_used_at DESC);

-- Enable RLS on adspy_searches table
ALTER TABLE public.adspy_searches ENABLE ROW LEVEL SECURITY;

-- Create policies for adspy_searches table
CREATE POLICY "Users can view their own AdSpy searches" 
    ON public.adspy_searches FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AdSpy searches" 
    ON public.adspy_searches FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AdSpy searches" 
    ON public.adspy_searches FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AdSpy searches" 
    ON public.adspy_searches FOR DELETE
    USING (auth.uid() = user_id);

-- Add source tracking to social_media_content for AdSpy content
ALTER TABLE public.social_media_content 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'adspy')),
ADD COLUMN IF NOT EXISTS adspy_ad_id TEXT, -- AdSpy's internal ad ID
ADD COLUMN IF NOT EXISTS adspy_metadata JSONB; -- Store additional AdSpy data

-- Create index for AdSpy content
CREATE INDEX IF NOT EXISTS social_media_content_source_type_idx ON public.social_media_content(source_type);
CREATE INDEX IF NOT EXISTS social_media_content_adspy_ad_id_idx ON public.social_media_content(adspy_ad_id);

-- Add comment to document the AdSpy integration
COMMENT ON COLUMN public.brands.adspy_username IS 'AdSpy API username for this brand';
COMMENT ON COLUMN public.brands.adspy_password_encrypted IS 'Encrypted AdSpy API password';
COMMENT ON COLUMN public.brands.adspy_token IS 'Current AdSpy API bearer token';
COMMENT ON COLUMN public.brands.adspy_token_expires_at IS 'When the AdSpy token expires';
COMMENT ON COLUMN public.brands.adspy_enabled IS 'Whether AdSpy integration is enabled for this brand';
COMMENT ON TABLE public.adspy_searches IS 'Stores AdSpy search queries and history for brands';
COMMENT ON COLUMN public.social_media_content.source_type IS 'Whether content was added manually or from AdSpy';
COMMENT ON COLUMN public.social_media_content.adspy_ad_id IS 'AdSpy internal ad ID for tracking';
COMMENT ON COLUMN public.social_media_content.adspy_metadata IS 'Additional AdSpy data like advertiser info, metrics, etc.'; 
-- Add Social Media Content Storage
-- This migration adds support for storing downloaded social media content organized by brands

-- Create social_media_content table
CREATE TABLE IF NOT EXISTS public.social_media_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Original source information
    source_url TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'tiktok')),
    
    -- Content details
    title TEXT,
    description TEXT,
    content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video')),
    
    -- File storage
    file_url TEXT NOT NULL, -- Supabase storage URL
    file_name TEXT NOT NULL,
    file_size BIGINT, -- Size in bytes
    thumbnail_url TEXT, -- For videos
    
    -- Metadata
    duration INTEGER, -- For videos, in seconds
    dimensions JSONB, -- {width: number, height: number}
    tags TEXT[], -- User-defined tags
    notes TEXT, -- User notes
    
    -- Organization
    is_favorite BOOLEAN DEFAULT false,
    folder_name TEXT, -- Optional folder organization
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Ensure unique source URLs per brand
    UNIQUE(brand_id, source_url)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS social_media_content_brand_id_idx ON public.social_media_content(brand_id);
CREATE INDEX IF NOT EXISTS social_media_content_user_id_idx ON public.social_media_content(user_id);
CREATE INDEX IF NOT EXISTS social_media_content_platform_idx ON public.social_media_content(platform);
CREATE INDEX IF NOT EXISTS social_media_content_content_type_idx ON public.social_media_content(content_type);
CREATE INDEX IF NOT EXISTS social_media_content_is_favorite_idx ON public.social_media_content(is_favorite);
CREATE INDEX IF NOT EXISTS social_media_content_folder_name_idx ON public.social_media_content(folder_name);
CREATE INDEX IF NOT EXISTS social_media_content_tags_idx ON public.social_media_content USING GIN(tags);
CREATE INDEX IF NOT EXISTS social_media_content_created_at_idx ON public.social_media_content(created_at DESC);

-- Add trigger to update updated_at column automatically
DROP TRIGGER IF EXISTS update_social_media_content_updated_at ON public.social_media_content;
CREATE TRIGGER update_social_media_content_updated_at
BEFORE UPDATE ON public.social_media_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on social_media_content table
ALTER TABLE public.social_media_content ENABLE ROW LEVEL SECURITY;

-- Create policies for social_media_content table
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

-- Create storage bucket for social media content
INSERT INTO storage.buckets (id, name, public) 
VALUES ('social-media-content', 'social-media-content', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload their own social media content" 
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'social-media-content' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own social media content" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'social-media-content' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own social media content" 
    ON storage.objects FOR UPDATE 
    USING (bucket_id = 'social-media-content' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own social media content" 
    ON storage.objects FOR DELETE 
    USING (bucket_id = 'social-media-content' AND auth.uid()::text = (storage.foldername(name))[1]); 
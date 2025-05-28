-- Update Social Media Content Storage
-- This migration updates the social media content feature with storage bucket and fixes

-- Create storage bucket for social media content if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'social-media-content', 
    'social-media-content', 
    true,
    52428800, -- 50MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

-- Update storage policies to be more permissive for public access
DROP POLICY IF EXISTS "Users can upload their own social media content" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own social media content" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own social media content" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own social media content" ON storage.objects;

-- Create new storage policies
CREATE POLICY "Authenticated users can upload social media content" 
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'social-media-content' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view social media content" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'social-media-content');

CREATE POLICY "Users can update their own social media content" 
    ON storage.objects FOR UPDATE 
    USING (bucket_id = 'social-media-content' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own social media content" 
    ON storage.objects FOR DELETE 
    USING (bucket_id = 'social-media-content' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add any missing columns to social_media_content table
ALTER TABLE public.social_media_content 
ADD COLUMN IF NOT EXISTS original_filename TEXT,
ADD COLUMN IF NOT EXISTS mime_type TEXT,
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_downloaded_at TIMESTAMPTZ;

-- Create index for download tracking
CREATE INDEX IF NOT EXISTS social_media_content_download_count_idx ON public.social_media_content(download_count DESC);
CREATE INDEX IF NOT EXISTS social_media_content_last_downloaded_idx ON public.social_media_content(last_downloaded_at DESC);

-- Add comment to document the table purpose
COMMENT ON TABLE public.social_media_content IS 'Stores social media content downloaded and organized by brands for Pinterest-style boards'; 
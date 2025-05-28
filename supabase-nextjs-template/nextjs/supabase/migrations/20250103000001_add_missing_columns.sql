-- Add missing columns to social_media_content table
-- These columns are expected by the UI but missing from the original schema

-- Add download tracking columns
ALTER TABLE public.social_media_content 
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_downloaded_at TIMESTAMPTZ;

-- Add source type tracking
ALTER TABLE public.social_media_content 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'adspy'));

-- Add AdSpy specific columns
ALTER TABLE public.social_media_content 
ADD COLUMN IF NOT EXISTS adspy_ad_id TEXT,
ADD COLUMN IF NOT EXISTS adspy_metadata JSONB;

-- Add missing file metadata columns
ALTER TABLE public.social_media_content 
ADD COLUMN IF NOT EXISTS original_filename TEXT,
ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS social_media_content_download_count_idx ON public.social_media_content(download_count);
CREATE INDEX IF NOT EXISTS social_media_content_source_type_idx ON public.social_media_content(source_type);
CREATE INDEX IF NOT EXISTS social_media_content_adspy_ad_id_idx ON public.social_media_content(adspy_ad_id);

-- Update existing records to have default values
UPDATE public.social_media_content 
SET 
    download_count = 0,
    source_type = 'manual',
    original_filename = file_name
WHERE download_count IS NULL OR source_type IS NULL OR original_filename IS NULL; 
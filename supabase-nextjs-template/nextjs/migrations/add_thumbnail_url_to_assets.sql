-- Migration: Add thumbnail_url column to ad_draft_assets table
-- This allows us to store references to video thumbnails extracted from the first frame

-- Add thumbnail_url column to ad_draft_assets table
ALTER TABLE ad_draft_assets 
ADD COLUMN thumbnail_url TEXT;

-- Add a comment to document the purpose of this column
COMMENT ON COLUMN ad_draft_assets.thumbnail_url IS 'URL of the extracted thumbnail image for video assets (first frame)';

-- Create an index for faster queries when filtering by assets that have thumbnails
CREATE INDEX idx_ad_draft_assets_thumbnail_url ON ad_draft_assets(thumbnail_url) WHERE thumbnail_url IS NOT NULL;

-- Add a check constraint to ensure thumbnail_url is only set for video assets
ALTER TABLE ad_draft_assets 
ADD CONSTRAINT chk_thumbnail_url_video_only 
CHECK (thumbnail_url IS NULL OR type = 'video'); 
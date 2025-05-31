-- Migration: Add thumbnail_timestamp column to ad_draft_assets table
-- This allows us to store the timestamp (in seconds) of when a custom thumbnail was selected
-- so the video scrubber can open to the previously selected frame

-- Add thumbnail_timestamp column to ad_draft_assets table
ALTER TABLE ad_draft_assets 
ADD COLUMN thumbnail_timestamp DECIMAL(10,3);

-- Add a comment to document the purpose of this column
COMMENT ON COLUMN ad_draft_assets.thumbnail_timestamp IS 'Timestamp in seconds where the custom thumbnail was captured from the video';

-- Create an index for faster queries when filtering by assets that have custom timestamps
CREATE INDEX idx_ad_draft_assets_thumbnail_timestamp ON ad_draft_assets(thumbnail_timestamp) WHERE thumbnail_timestamp IS NOT NULL;

-- Add a check constraint to ensure thumbnail_timestamp is only set for video assets
ALTER TABLE ad_draft_assets 
ADD CONSTRAINT chk_thumbnail_timestamp_video_only 
CHECK (thumbnail_timestamp IS NULL OR type = 'video');

-- Add a check constraint to ensure thumbnail_timestamp is positive
ALTER TABLE ad_draft_assets 
ADD CONSTRAINT chk_thumbnail_timestamp_positive 
CHECK (thumbnail_timestamp IS NULL OR thumbnail_timestamp >= 0); 
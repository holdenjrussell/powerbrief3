-- Migration to enhance Context Hub with tagging and merged tabs

-- Step 1: Add new columns to the onesheet_context_data table
ALTER TABLE public.onesheet_context_data
ADD COLUMN IF NOT EXISTS brand_type TEXT,
ADD COLUMN IF NOT EXISTS post_type TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT;

-- Step 2: Update data for the new merged 'social_content' source type
-- Consolidate all social-related sources into 'social_content'
UPDATE public.onesheet_context_data
SET source_type = 'social_content'
WHERE source_type IN ('brand_social', 'competitor_social', 'competitor_ads', 'tiktok', 'youtube');

-- Step 3: Set brand_type for existing website and social entries
-- Mark competitor websites
UPDATE public.onesheet_context_data
SET brand_type = 'competitor'
WHERE source_type = 'competitor_website';

-- Mark our brand's websites
UPDATE public.onesheet_context_data
SET brand_type = 'our_brand'
WHERE source_type = 'brand_website';

-- Step 4: Update tags for existing social content
UPDATE public.onesheet_context_data
SET 
  -- Set post_type based on original source
  post_type = CASE
    WHEN source_type IN ('competitor_ads', 'paid_social') THEN 'paid'
    ELSE 'organic'
  END,
  -- Auto-detect platform from URL
  platform = CASE
    WHEN source_url LIKE '%facebook.com%' OR source_url LIKE '%instagram.com%' THEN 'meta'
    WHEN source_url LIKE '%tiktok.com%' THEN 'tiktok'
    WHEN source_url LIKE '%youtube.com%' OR source_url LIKE '%youtu.be%' THEN 'youtube'
    WHEN source_url LIKE '%twitter.com%' OR source_url LIKE '%x.com%' THEN 'x'
    ELSE 'other'
  END
WHERE source_type = 'social_content';

-- Step 5: Merge 'competitor_website' into 'brand_website' and rely on brand_type
UPDATE public.onesheet_context_data
SET source_type = 'brand_website'
WHERE source_type = 'competitor_website';


COMMENT ON COLUMN public.onesheet_context_data.brand_type IS 'Identifies content as belonging to "our_brand" or a "competitor".';
COMMENT ON COLUMN public.onesheet_context_data.post_type IS 'For social content, identifies the post as "organic" or "paid".';
COMMENT ON COLUMN public.onesheet_context_data.platform IS 'For social content, identifies the platform (meta, tiktok, youtube, etc.).'; 
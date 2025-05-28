-- Add support for multiple Meta ad accounts and pages
-- This migration extends the Meta integration to support multiple accounts/pages with defaults

-- Add new columns for multiple accounts/pages (stored as JSON arrays)
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS meta_ad_accounts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS meta_facebook_pages JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS meta_instagram_accounts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS meta_pixels JSONB DEFAULT '[]'::jsonb;

-- Add default selection columns (these will reference IDs from the arrays above)
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS meta_default_ad_account_id TEXT,
ADD COLUMN IF NOT EXISTS meta_default_facebook_page_id TEXT,
ADD COLUMN IF NOT EXISTS meta_default_instagram_account_id TEXT,
ADD COLUMN IF NOT EXISTS meta_default_pixel_id TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS brands_meta_ad_accounts_idx ON public.brands USING GIN(meta_ad_accounts);
CREATE INDEX IF NOT EXISTS brands_meta_facebook_pages_idx ON public.brands USING GIN(meta_facebook_pages);
CREATE INDEX IF NOT EXISTS brands_meta_instagram_accounts_idx ON public.brands USING GIN(meta_instagram_accounts);
CREATE INDEX IF NOT EXISTS brands_meta_pixels_idx ON public.brands USING GIN(meta_pixels);

CREATE INDEX IF NOT EXISTS brands_meta_default_ad_account_id_idx ON public.brands(meta_default_ad_account_id);
CREATE INDEX IF NOT EXISTS brands_meta_default_facebook_page_id_idx ON public.brands(meta_default_facebook_page_id);
CREATE INDEX IF NOT EXISTS brands_meta_default_instagram_account_id_idx ON public.brands(meta_default_instagram_account_id);
CREATE INDEX IF NOT EXISTS brands_meta_default_pixel_id_idx ON public.brands(meta_default_pixel_id);

-- Migrate existing single values to the new multiple structure
-- This will preserve existing data while enabling the new multi-select functionality
UPDATE public.brands 
SET 
  meta_ad_accounts = CASE 
    WHEN meta_ad_account_id IS NOT NULL THEN 
      jsonb_build_array(
        jsonb_build_object(
          'id', meta_ad_account_id,
          'name', 'Migrated Ad Account',
          'account_status', 'ACTIVE',
          'currency', 'USD',
          'timezone_name', 'America/New_York'
        )
      )
    ELSE '[]'::jsonb
  END,
  meta_facebook_pages = CASE 
    WHEN meta_facebook_page_id IS NOT NULL THEN 
      jsonb_build_array(
        jsonb_build_object(
          'id', meta_facebook_page_id,
          'name', 'Migrated Facebook Page',
          'category', 'Business'
        )
      )
    ELSE '[]'::jsonb
  END,
  meta_instagram_accounts = CASE 
    WHEN meta_instagram_actor_id IS NOT NULL THEN 
      jsonb_build_array(
        jsonb_build_object(
          'id', meta_instagram_actor_id,
          'name', 'Migrated Instagram Account',
          'username', 'migrated_account'
        )
      )
    ELSE '[]'::jsonb
  END,
  meta_pixels = CASE 
    WHEN meta_pixel_id IS NOT NULL THEN 
      jsonb_build_array(
        jsonb_build_object(
          'id', meta_pixel_id,
          'name', 'Migrated Pixel'
        )
      )
    ELSE '[]'::jsonb
  END,
  meta_default_ad_account_id = meta_ad_account_id,
  meta_default_facebook_page_id = meta_facebook_page_id,
  meta_default_instagram_account_id = meta_instagram_actor_id,
  meta_default_pixel_id = meta_pixel_id
WHERE 
  meta_ad_account_id IS NOT NULL 
  OR meta_facebook_page_id IS NOT NULL 
  OR meta_instagram_actor_id IS NOT NULL 
  OR meta_pixel_id IS NOT NULL;

-- Add comments to document the new structure
COMMENT ON COLUMN public.brands.meta_ad_accounts IS 'JSON array of Meta ad accounts with full details (id, name, status, etc.)';
COMMENT ON COLUMN public.brands.meta_facebook_pages IS 'JSON array of Facebook pages with full details (id, name, category, etc.)';
COMMENT ON COLUMN public.brands.meta_instagram_accounts IS 'JSON array of Instagram accounts with full details (id, name, username, etc.)';
COMMENT ON COLUMN public.brands.meta_pixels IS 'JSON array of Meta pixels with full details (id, name, etc.)';

COMMENT ON COLUMN public.brands.meta_default_ad_account_id IS 'Default ad account ID selected from meta_ad_accounts array';
COMMENT ON COLUMN public.brands.meta_default_facebook_page_id IS 'Default Facebook page ID selected from meta_facebook_pages array';
COMMENT ON COLUMN public.brands.meta_default_instagram_account_id IS 'Default Instagram account ID selected from meta_instagram_accounts array';
COMMENT ON COLUMN public.brands.meta_default_pixel_id IS 'Default pixel ID selected from meta_pixels array';

-- Verify the migration
SELECT 
  id,
  name,
  meta_ad_accounts,
  meta_facebook_pages,
  meta_default_ad_account_id,
  meta_default_facebook_page_id
FROM public.brands 
WHERE 
  meta_ad_accounts != '[]'::jsonb 
  OR meta_facebook_pages != '[]'::jsonb
LIMIT 5; 
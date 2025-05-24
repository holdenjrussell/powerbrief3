-- Add Meta Integration fields to brands table
-- Run this in your Supabase SQL Editor

-- Add Meta OAuth and token storage columns
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS meta_access_token TEXT,
ADD COLUMN IF NOT EXISTS meta_access_token_iv TEXT,
ADD COLUMN IF NOT EXISTS meta_access_token_auth_tag TEXT,
ADD COLUMN IF NOT EXISTS meta_access_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS meta_user_id TEXT;

-- Add Meta asset selection columns
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS meta_ad_account_id TEXT,
ADD COLUMN IF NOT EXISTS meta_facebook_page_id TEXT,
ADD COLUMN IF NOT EXISTS meta_instagram_actor_id TEXT,
ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS brands_meta_user_id_idx ON public.brands(meta_user_id);
CREATE INDEX IF NOT EXISTS brands_meta_ad_account_id_idx ON public.brands(meta_ad_account_id);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'brands' 
AND table_schema = 'public'
AND column_name LIKE 'meta_%'
ORDER BY column_name; 
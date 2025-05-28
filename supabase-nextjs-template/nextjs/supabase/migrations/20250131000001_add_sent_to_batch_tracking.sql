-- Add tracking for assets sent to ad batch
-- This migration adds support for tracking which social media content has been sent to ad batch

-- Add column to track if content has been sent to ad batch
ALTER TABLE public.social_media_content 
ADD COLUMN IF NOT EXISTS sent_to_ad_batch BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sent_to_ad_batch_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sent_to_ad_batch_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for sent to batch tracking
CREATE INDEX IF NOT EXISTS social_media_content_sent_to_ad_batch_idx ON public.social_media_content(sent_to_ad_batch);
CREATE INDEX IF NOT EXISTS social_media_content_sent_to_ad_batch_at_idx ON public.social_media_content(sent_to_ad_batch_at DESC);

-- Add comments to document the new fields
COMMENT ON COLUMN public.social_media_content.sent_to_ad_batch IS 'Whether this content has been sent to ad batch in the ad upload tool';
COMMENT ON COLUMN public.social_media_content.sent_to_ad_batch_at IS 'When this content was sent to ad batch';
COMMENT ON COLUMN public.social_media_content.sent_to_ad_batch_by IS 'User who sent this content to ad batch'; 
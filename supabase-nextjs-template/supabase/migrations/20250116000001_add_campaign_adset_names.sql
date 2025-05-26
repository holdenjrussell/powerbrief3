-- Add campaign_name and ad_set_name fields to ad_drafts table
-- This allows storing the actual names for display in the UI instead of just IDs

ALTER TABLE public.ad_drafts 
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS ad_set_name TEXT;

-- Add comments documenting these fields
COMMENT ON COLUMN public.ad_drafts.campaign_name IS 'Campaign name for display purposes (stored alongside campaign_id)';
COMMENT ON COLUMN public.ad_drafts.ad_set_name IS 'Ad set name for display purposes (stored alongside ad_set_id)';

-- Create indexes for potential filtering/searching
CREATE INDEX IF NOT EXISTS ad_drafts_campaign_name_idx ON public.ad_drafts(campaign_name);
CREATE INDEX IF NOT EXISTS ad_drafts_ad_set_name_idx ON public.ad_drafts(ad_set_name); 
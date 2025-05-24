-- Create ad_batches table for Ad Upload Tool persistence
-- This table stores the configuration/defaults from the first page of the ad upload tool

CREATE TABLE IF NOT EXISTS public.ad_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    
    -- Configuration fields from AdBatchCreator
    ad_account_id TEXT,
    campaign_id TEXT,
    ad_set_id TEXT,
    fb_page_id TEXT,
    ig_account_id TEXT,
    pixel_id TEXT,
    
    -- Default values for ads
    url_params TEXT,
    destination_url TEXT,
    call_to_action TEXT,
    status TEXT DEFAULT 'PAUSED',
    primary_text TEXT,
    headline TEXT,
    description TEXT,
    
    -- Status tracking
    is_active BOOLEAN DEFAULT true,
    last_accessed_at TIMESTAMPTZ DEFAULT now(),
    
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS ad_batches_user_id_idx ON public.ad_batches(user_id);
CREATE INDEX IF NOT EXISTS ad_batches_brand_id_idx ON public.ad_batches(brand_id);
CREATE INDEX IF NOT EXISTS ad_batches_is_active_idx ON public.ad_batches(is_active);
CREATE INDEX IF NOT EXISTS ad_batches_last_accessed_idx ON public.ad_batches(last_accessed_at);

-- Add update trigger
DROP TRIGGER IF EXISTS update_ad_batches_updated_at ON public.ad_batches;
CREATE TRIGGER update_ad_batches_updated_at
BEFORE UPDATE ON public.ad_batches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.ad_batches ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own ad batches" ON public.ad_batches;
CREATE POLICY "Users can view their own ad batches"
    ON public.ad_batches FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own ad batches" ON public.ad_batches;
CREATE POLICY "Users can insert their own ad batches"
    ON public.ad_batches FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own ad batches" ON public.ad_batches;
CREATE POLICY "Users can update their own ad batches"
    ON public.ad_batches FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own ad batches" ON public.ad_batches;
CREATE POLICY "Users can delete their own ad batches"
    ON public.ad_batches FOR DELETE
    USING (auth.uid() = user_id);

-- Add relation from ad_drafts to ad_batches
ALTER TABLE public.ad_drafts 
ADD COLUMN IF NOT EXISTS ad_batch_id UUID REFERENCES public.ad_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ad_drafts_ad_batch_id_idx ON public.ad_drafts(ad_batch_id); 
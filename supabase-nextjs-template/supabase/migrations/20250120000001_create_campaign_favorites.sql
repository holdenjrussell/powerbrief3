-- Create campaign_favorites table for storing user's favorite campaigns
-- This allows users to mark campaigns as favorites which will show at the top of the campaign selector

CREATE TABLE IF NOT EXISTS public.campaign_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    campaign_id TEXT NOT NULL,
    campaign_name TEXT,
    ad_account_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Ensure unique combination of user, brand, and campaign
    UNIQUE(user_id, brand_id, campaign_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS campaign_favorites_user_id_idx ON public.campaign_favorites(user_id);
CREATE INDEX IF NOT EXISTS campaign_favorites_brand_id_idx ON public.campaign_favorites(brand_id);
CREATE INDEX IF NOT EXISTS campaign_favorites_campaign_id_idx ON public.campaign_favorites(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_favorites_ad_account_id_idx ON public.campaign_favorites(ad_account_id);

-- Add update trigger
DROP TRIGGER IF EXISTS update_campaign_favorites_updated_at ON public.campaign_favorites;
CREATE TRIGGER update_campaign_favorites_updated_at
BEFORE UPDATE ON public.campaign_favorites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.campaign_favorites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own campaign favorites" ON public.campaign_favorites;
CREATE POLICY "Users can view their own campaign favorites"
    ON public.campaign_favorites FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own campaign favorites" ON public.campaign_favorites;
CREATE POLICY "Users can insert their own campaign favorites"
    ON public.campaign_favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own campaign favorites" ON public.campaign_favorites;
CREATE POLICY "Users can update their own campaign favorites"
    ON public.campaign_favorites FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own campaign favorites" ON public.campaign_favorites;
CREATE POLICY "Users can delete their own campaign favorites"
    ON public.campaign_favorites FOR DELETE
    USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE public.campaign_favorites IS 'Stores user favorite campaigns for quick access in campaign selectors';
COMMENT ON COLUMN public.campaign_favorites.campaign_id IS 'Meta campaign ID from Facebook/Instagram API';
COMMENT ON COLUMN public.campaign_favorites.campaign_name IS 'Campaign name for display (cached from Meta API)';
COMMENT ON COLUMN public.campaign_favorites.ad_account_id IS 'Meta ad account ID that contains this campaign'; 
-- Update UGC Creator Pipeline Schema
-- This migration adds additional fields and tables required for the full UGC Creator Pipeline implementation

-- Modify ugc_creator_scripts table to add missing fields
ALTER TABLE public.ugc_creator_scripts 
ADD COLUMN IF NOT EXISTS hook_body TEXT,
ADD COLUMN IF NOT EXISTS cta TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'video';

-- Add brand fields for UGC creators
ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS ugc_filming_instructions TEXT,
ADD COLUMN IF NOT EXISTS ugc_company_description TEXT,
ADD COLUMN IF NOT EXISTS ugc_default_system_instructions TEXT;

-- Create a public share table for scripts
CREATE TABLE IF NOT EXISTS public.ugc_script_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.ugc_creators(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    share_id TEXT UNIQUE NOT NULL,
    scripts JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add RLS policies
ALTER TABLE public.ugc_script_shares ENABLE ROW LEVEL SECURITY;

-- Add appropriate policies for the share table
CREATE POLICY "Anyone can view ugc script shares" 
    ON public.ugc_script_shares FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own ugc script shares" 
    ON public.ugc_script_shares FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ugc script shares" 
    ON public.ugc_script_shares FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ugc script shares" 
    ON public.ugc_script_shares FOR DELETE
    USING (auth.uid() = user_id);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_ugc_script_shares_updated_at ON public.ugc_script_shares;
CREATE TRIGGER update_ugc_script_shares_updated_at
BEFORE UPDATE ON public.ugc_script_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS ugc_script_shares_share_id_idx ON public.ugc_script_shares(share_id);
CREATE INDEX IF NOT EXISTS ugc_script_shares_creator_id_idx ON public.ugc_script_shares(creator_id);
CREATE INDEX IF NOT EXISTS ugc_script_shares_brand_id_idx ON public.ugc_script_shares(brand_id); 
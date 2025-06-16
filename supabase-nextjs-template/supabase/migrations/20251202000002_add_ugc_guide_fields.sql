-- Add UGC Guide Fields
-- This migration adds fields for UGC script guides and company descriptions

-- Add the new fields to ugc_creator_scripts table if they don't exist
ALTER TABLE public.ugc_creator_scripts 
ADD COLUMN IF NOT EXISTS company_description TEXT,
ADD COLUMN IF NOT EXISTS guide_description TEXT,
ADD COLUMN IF NOT EXISTS filming_instructions TEXT;

-- Add default fields to the brands table if they don't exist
ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS ugc_company_description TEXT,
ADD COLUMN IF NOT EXISTS ugc_guide_description TEXT,
ADD COLUMN IF NOT EXISTS ugc_filming_instructions TEXT,
ADD COLUMN IF NOT EXISTS ugc_default_system_instructions TEXT;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS brands_ugc_fields_idx 
ON public.brands(ugc_company_description, ugc_guide_description, ugc_filming_instructions);

-- Update RLS policies to allow access to these new fields
CREATE POLICY IF NOT EXISTS "Users can view their own brands' UGC fields" 
    ON public.brands FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own brands' UGC fields" 
    ON public.brands FOR UPDATE
    USING (auth.uid() = user_id); 
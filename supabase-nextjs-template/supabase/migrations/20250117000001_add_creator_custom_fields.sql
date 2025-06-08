-- Add custom fields storage to existing ugc_creators table
-- This allows storing dynamic field values while keeping existing columns

-- Add custom_fields JSON column to store dynamic field values
ALTER TABLE public.ugc_creators 
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Add index for custom fields queries
CREATE INDEX IF NOT EXISTS ugc_creators_custom_fields_idx ON public.ugc_creators USING GIN (custom_fields);

-- Add comment explaining the hybrid approach
COMMENT ON COLUMN public.ugc_creators.custom_fields IS 'Stores dynamic field values configured by brands. Core fields remain as dedicated columns for performance and consistency.';

-- Update existing creators to have empty custom_fields if null
UPDATE public.ugc_creators 
SET custom_fields = '{}'::jsonb 
WHERE custom_fields IS NULL; 
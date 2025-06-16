-- Add "Use Page As Actor" functionality for Instagram settings
-- This migration adds fields to support Page-Backed Instagram Accounts (PBIA)

-- Add columns to store "Use Page As Actor" settings
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS meta_use_page_as_actor BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS meta_page_backed_instagram_accounts JSONB DEFAULT '{}'::jsonb;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS brands_meta_use_page_as_actor_idx ON public.brands(meta_use_page_as_actor);
CREATE INDEX IF NOT EXISTS brands_meta_page_backed_instagram_accounts_idx ON public.brands USING GIN(meta_page_backed_instagram_accounts);

-- Add comments to document the new structure
COMMENT ON COLUMN public.brands.meta_use_page_as_actor IS 'Boolean flag to enable "Use Page As Actor" for Instagram ads - creates Page-Backed Instagram Accounts';
COMMENT ON COLUMN public.brands.meta_page_backed_instagram_accounts IS 'JSON object mapping Facebook page IDs to their Page-Backed Instagram Account IDs (e.g., {"123456": "789012"})';

-- Example of the JSON structure:
-- meta_page_backed_instagram_accounts: {"123456789": "987654321", "111222333": "444555666"}
-- This maps Facebook Page ID -> Page-Backed Instagram Account ID 
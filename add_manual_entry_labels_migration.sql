-- Add support for manual entry labels/names
-- This migration adds fields to store custom names/labels for manually entered Meta assets

-- Add columns to store manual entry labels
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS meta_manual_page_labels JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS meta_manual_instagram_labels JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS meta_manual_instagram_pairings JSONB DEFAULT '{}'::jsonb;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS brands_meta_manual_page_labels_idx ON public.brands USING GIN(meta_manual_page_labels);
CREATE INDEX IF NOT EXISTS brands_meta_manual_instagram_labels_idx ON public.brands USING GIN(meta_manual_instagram_labels);
CREATE INDEX IF NOT EXISTS brands_meta_manual_instagram_pairings_idx ON public.brands USING GIN(meta_manual_instagram_pairings);

-- Add comments to document the new structure
COMMENT ON COLUMN public.brands.meta_manual_page_labels IS 'JSON object mapping manual Facebook page IDs to custom labels/names (e.g., {"123456": "Main Brand Page"})';
COMMENT ON COLUMN public.brands.meta_manual_instagram_labels IS 'JSON object mapping manual Instagram account IDs to custom labels/names (e.g., {"789012": "Brand Instagram"})';
COMMENT ON COLUMN public.brands.meta_manual_instagram_pairings IS 'JSON object mapping Facebook page IDs to Instagram account IDs for manual pairing (e.g., {"123456": "789012"})';

-- Example of the JSON structure:
-- meta_manual_page_labels: {"123456789": "Main Brand Page", "987654321": "Secondary Page"}
-- meta_manual_instagram_labels: {"111222333": "Primary Instagram", "444555666": "Campaign Account"}
-- meta_manual_instagram_pairings: {"123456789": "111222333", "987654321": "444555666"} 
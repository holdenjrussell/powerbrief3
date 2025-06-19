-- Add brand_type column to distinguish between our brand vs competitor content
ALTER TABLE onesheet_context_data 
ADD COLUMN IF NOT EXISTS brand_type TEXT DEFAULT 'our_brand' CHECK (brand_type IN ('our_brand', 'competitor', 'neutral'));

-- Add comment for documentation
COMMENT ON COLUMN onesheet_context_data.brand_type IS 'Distinguishes whether content is about our brand, competitor, or neutral (default: our_brand)';

-- Create index for better performance when filtering by brand type
CREATE INDEX IF NOT EXISTS idx_onesheet_context_data_brand_type ON onesheet_context_data(brand_type); 
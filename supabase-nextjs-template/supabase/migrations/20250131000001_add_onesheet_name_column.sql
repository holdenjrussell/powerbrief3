-- Add name column to onesheet table for better OneSheet identification
ALTER TABLE public.onesheet 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Update existing OneSheets to have a default name based on product
UPDATE public.onesheet 
SET name = COALESCE(product, 'Untitled OneSheet')
WHERE name IS NULL OR name = '';

-- Add a constraint to ensure name is not null for new records
-- Note: We don't make it NOT NULL immediately to avoid issues with existing data
-- The application will enforce this requirement 
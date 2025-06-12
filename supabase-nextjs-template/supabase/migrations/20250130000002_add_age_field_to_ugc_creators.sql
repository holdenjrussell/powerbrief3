-- Add age field to ugc_creators table
-- This allows storing age as a dedicated column instead of in custom_fields

-- Add age column to ugc_creators table
ALTER TABLE public.ugc_creators 
ADD COLUMN IF NOT EXISTS age TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN public.ugc_creators.age IS 'Age range of the creator (e.g., "21-25", "26-30", etc.)';

-- Migrate any existing age data from custom_fields to the new column
UPDATE public.ugc_creators 
SET age = (custom_fields->>'age') 
WHERE custom_fields ? 'age' AND age IS NULL;

-- Remove age from custom_fields for records that have been migrated
UPDATE public.ugc_creators 
SET custom_fields = custom_fields - 'age'
WHERE custom_fields ? 'age' AND age IS NOT NULL; 
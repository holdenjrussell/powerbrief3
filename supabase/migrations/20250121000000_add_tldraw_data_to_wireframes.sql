-- Add tldraw_data column to wireframes table for storing tldraw designs
-- This column will store the complete tldraw document/store state

-- Add tldraw_data column to wireframes table
ALTER TABLE public.wireframes 
ADD COLUMN IF NOT EXISTS tldraw_data JSONB;

-- Add comment to describe the column
COMMENT ON COLUMN public.wireframes.tldraw_data IS 'Stores the complete tldraw document/store state including shapes, assets, and other design data';

-- Update the updated_at timestamp when tldraw_data changes
CREATE OR REPLACE FUNCTION update_wireframe_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS wireframes_updated_at_trigger ON public.wireframes;
CREATE TRIGGER wireframes_updated_at_trigger
  BEFORE UPDATE ON public.wireframes
  FOR EACH ROW
  EXECUTE FUNCTION update_wireframe_updated_at(); 
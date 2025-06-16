-- Add custom_links field to brief_concepts table
-- This field stores an array of custom links with names and URLs for related assets

ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS custom_links JSONB DEFAULT '[]'::jsonb;

-- Create index for faster querying of custom_links
CREATE INDEX IF NOT EXISTS brief_concepts_custom_links_idx ON public.brief_concepts USING GIN (custom_links);

-- Add comment for documentation
COMMENT ON COLUMN public.brief_concepts.custom_links IS 'Array of custom links with name and url for related assets (e.g., [{"id": "uuid", "name": "Asset Pack", "url": "https://..."}])'; 
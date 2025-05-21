-- Add hook_type and hook_count columns to brief_concepts table
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS hook_type TEXT;
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS hook_count INTEGER;

-- Comment on the columns
COMMENT ON COLUMN public.brief_concepts.hook_type IS 'Type of hook for the concept (caption, verbal, both)';
COMMENT ON COLUMN public.brief_concepts.hook_count IS 'Number of hook options to generate'; 
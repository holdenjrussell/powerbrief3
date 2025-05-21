-- Add spoken_hook_options column to brief_concepts table
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS spoken_hook_options TEXT;

-- Comment on the spoken_hook_options column
COMMENT ON COLUMN public.brief_concepts.spoken_hook_options IS 'Text field containing options for spoken hooks in videos'; 
-- Add generated_broll field to brief_concepts table
-- This field stores Google Veo 2 generated B-roll video data

ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS generated_broll JSONB DEFAULT NULL;

-- Create index for faster querying of generated_broll
CREATE INDEX IF NOT EXISTS brief_concepts_generated_broll_idx ON public.brief_concepts USING GIN (generated_broll);

-- Add comment for documentation
COMMENT ON COLUMN public.brief_concepts.generated_broll IS 'Google Veo 2 generated B-roll videos with prompts and storage paths (e.g., [{"visual_description": "...", "gemini_prompt": "...", "video_urls": ["..."], "storage_paths": ["..."]}])'; 
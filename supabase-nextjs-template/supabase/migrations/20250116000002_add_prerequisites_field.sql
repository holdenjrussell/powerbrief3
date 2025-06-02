-- Add prerequisites field to brief_concepts table
-- This field stores an array of prerequisites with their completion status

ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS prerequisites JSONB DEFAULT '[]'::jsonb;

-- Create index for faster querying of prerequisites
CREATE INDEX IF NOT EXISTS brief_concepts_prerequisites_idx ON public.brief_concepts USING GIN (prerequisites);

-- Add comment for documentation
COMMENT ON COLUMN public.brief_concepts.prerequisites IS 'Array of prerequisites with completion status (e.g., [{"id": "uuid", "type": "AI Voiceover", "completed": false}])'; 